// One-off backfill: fixes seller payouts for admin-created store Promotions.
// Before this fix, sellers were paid on the DISCOUNTED price the buyer paid,
// even when the discount was the admin's decision, not theirs. Sellers
// should always receive the full price for an admin promo — the platform
// absorbs the gap. Seller-set sales (no Promotion involved) are untouched;
// those correctly pay out at the discounted price, same as always.
//
// Usage (run from the backend/ folder):
//   node scripts/backfillPromoPayouts.mjs              (dry run — report only)
//   node scripts/backfillPromoPayouts.mjs --apply       (writes for real)
//
// Two separate buckets, because only one of them involves money moving:
//
//   1. ALREADY COMPLETED items (order status "completed", or an item with
//      status "completed" on a "partial" order) were already paid out under
//      the old (buggy) logic. These get the seller actually CREDITED now —
//      pendingPayout/totalRevenue incremented, payoutHistory entry added —
//      and the item marked with sellerPayoutPrice so a re-run won't double it.
//
//   2. STILL-OPEN items (any non-terminal status: pending, confirmed,
//      shipped, ready_for_pickup, pending-verification, disputed) were
//      created before this deploy and so are MISSING sellerPayoutPrice
//      entirely. Without this script, when they eventually complete, the
//      payout code's `item.sellerPayoutPrice ?? item.price` fallback would
//      still use the discounted price — the code fix alone does NOT cover
//      orders that already existed before it shipped. This bucket just sets
//      sellerPayoutPrice on the item now (no money moves yet) so that
//      whenever the order does complete, the now-fixed payout logic pays
//      the seller correctly.
//
// How it matches orders to promotions: for every Promotion ever created
// (any status), for every product CURRENTLY still listed in its `products`
// array, it finds orders containing that product whose createdAt falls
// within the promotion's [startsAt, endsAt] window. Caveat: if a product was
// reassigned from one promotion to another before the first one's window
// ended, the first promotion's `products` array no longer lists it (it was
// detached at reassignment time), so an order placed while under the FIRST
// promotion could be missed. Given promotions are a brand-new feature with a
// small number of them so far, review the dry-run output before --apply.
//
// Positive + negative checks before crediting anything (a matching product
// and time window does NOT by itself prove this item's price came from the
// promo's discount):
//   - Variants are skipped — they never carry promo pricing.
//   - Items matching an accepted/applied Negotiation (same buyer, product,
//     price) are skipped — a negotiated price is unrelated to the promo.
//   - The reverse-computed full price must be under the promo price ceiling
//     (₦10,000) — createPromotion never allows a pricier product in.
//   - POSITIVE check: the reverse-computed full price must match the
//     product's actual price on record (±₦1 rounding). Without this, ANY
//     item price — including one where the buyer paid full price with NO
//     discount at all — would still produce a plausible-looking "shortfall"
//     from the reverse-discount formula alone and risk a fabricated credit.
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const apply = process.argv.includes("--apply");
const PROMOTABLE_PRICE_CEILING = 10000; // must match promotionController.js
const OPEN_STATUSES = ["pending", "pending-verification", "confirmed", "shipped", "ready_for_pickup", "disputed"];
const PRICE_TOLERANCE = 1; // naira, for rounding

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Promotions   = mongoose.connection.collection("promotions");
  const Orders       = mongoose.connection.collection("orders");
  const Sellers      = mongoose.connection.collection("sellers");
  const Config       = mongoose.connection.collection("configs");
  const Negotiations = mongoose.connection.collection("negotiations");
  const Products     = mongoose.connection.collection("products");

  const cfgDoc = await Config.findOne({});
  // Matches getFeeConfig() in orderController.js — fields live under `fees`,
  // and platformFee is a PERCENTAGE (e.g. 5.0), not a 0-1 fraction.
  const platformFeeEnabled = cfgDoc?.fees?.platformFeeEnabled ?? false;
  const platformFeeRate = (cfgDoc?.fees?.platformFee ?? 5.0) / 100;
  console.log(`Platform fee: ${platformFeeEnabled ? `${(platformFeeRate * 100).toFixed(1)}%` : "disabled"}\n`);

  const promotions = await Promotions.find({}).toArray();
  console.log(`Found ${promotions.length} promotion(s) ever created.\n`);

  const productIds = [...new Set(promotions.flatMap((p) => (p.products || []).map((id) => id.toString())))];
  const productDocs = productIds.length
    ? await Products.find({ _id: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) } }).toArray()
    : [];
  const productPriceMap = new Map(productDocs.map((p) => [p._id.toString(), p.price]));

  const sellerNames = new Map();
  const creditedBySeller = new Map();
  const markedOpenCount = { n: 0 };
  let skippedVariant = 0, skippedNegotiated = 0, skippedCeiling = 0, skippedPriceMismatch = 0;

  async function sellerName(sellerKey) {
    if (!sellerNames.has(sellerKey)) {
      const sellerDoc = await Sellers.findOne({ user: new mongoose.Types.ObjectId(sellerKey) });
      sellerNames.set(sellerKey, sellerDoc?.storeName || sellerKey);
    }
    return sellerNames.get(sellerKey);
  }

  // Shared eligibility checks for both buckets. Returns the verified
  // fullPrice, or null if this item doesn't check out.
  async function verifyFullPrice(order, item, promo) {
    if (item.variant?.sku) { skippedVariant++; return null; }
    if (!item.price || item.price <= 0) return null;

    const fullPrice = Math.round(item.price / (1 - promo.discountPercent / 100));
    if (fullPrice <= item.price) return null; // no discount evident

    const negotiated = await Negotiations.findOne({
      item: item.product, buyer: order.buyer, proposedPrice: item.price,
      status: { $in: ["accepted", "applied"] },
    });
    if (negotiated) { skippedNegotiated++; return null; }

    if (fullPrice >= PROMOTABLE_PRICE_CEILING) { skippedCeiling++; return null; }

    const recordedPrice = productPriceMap.get(item.product.toString());
    if (recordedPrice == null || Math.abs(fullPrice - recordedPrice) > PRICE_TOLERANCE) {
      skippedPriceMismatch++;
      return null;
    }

    return fullPrice;
  }

  for (const promo of promotions) {
    if (!promo.products?.length) continue;
    const orders = await Orders.find({
      "items.product": { $in: promo.products },
      createdAt: { $gte: promo.startsAt, $lte: promo.endsAt },
    }).toArray();

    for (const order of orders) {
      const isCompleted = order.status === "completed" || order.status === "partial";
      const isOpen = OPEN_STATUSES.includes(order.status);
      if (!isCompleted && !isOpen) continue; // cancelled, or anything else — nothing to do

      for (const item of order.items) {
        const productId = item.product?.toString();
        if (!productId || !promo.products.some((p) => p.toString() === productId)) continue;
        if (item.sellerPayoutPrice != null) continue; // already backfilled

        if (isCompleted) {
          const alreadyPaid = order.status === "completed" || item.status === "completed";
          if (!alreadyPaid) continue; // partial order, this specific item not yet delivered
        }

        const fullPrice = await verifyFullPrice(order, item, promo);
        if (fullPrice == null) continue;

        if (isCompleted) {
          const shortfall = (fullPrice - item.price) * (item.quantity || 1);
          const topUp = platformFeeEnabled ? Math.floor(shortfall * (1 - platformFeeRate)) : Math.floor(shortfall);
          if (topUp <= 0) continue;

          const sellerKey = (order.seller || "").toString();
          if (!sellerKey) continue;
          const name = await sellerName(sellerKey);
          console.log(`[completed] ${name} — order ${order._id} item ${item._id}: paid ₦${item.price} x${item.quantity || 1}, should be ₦${fullPrice} x${item.quantity || 1} → +₦${topUp}`);
          // Tracked here (not just on successful apply) so the dry-run summary
          // shows what WOULD be credited, not only what already was.
          creditedBySeller.set(sellerKey, (creditedBySeller.get(sellerKey) || 0) + topUp);

          if (apply) {
            const session = await mongoose.startSession();
            try {
              await session.withTransaction(async () => {
                const markResult = await Orders.updateOne(
                  { _id: order._id, items: { $elemMatch: { _id: item._id, sellerPayoutPrice: { $exists: false } } } },
                  { $set: { "items.$.sellerPayoutPrice": fullPrice } },
                  { session }
                );
                if (markResult.modifiedCount !== 1) throw new Error("ALREADY_MARKED");

                const creditResult = await Sellers.updateOne(
                  { user: new mongoose.Types.ObjectId(sellerKey) },
                  {
                    $inc: { pendingPayout: topUp, totalRevenue: shortfall },
                    $push: { payoutHistory: { amount: topUp, status: "pending", referenceId: `PROMO_BACKFILL_${order._id}_${item._id}` } },
                  },
                  { session }
                );
                if (creditResult.matchedCount !== 1) throw new Error("NO_SELLER_DOC");
              });
              console.log(`   -> credited.`);
            } catch (err) {
              // Back out of the running total — this one didn't actually happen.
              creditedBySeller.set(sellerKey, (creditedBySeller.get(sellerKey) || 0) - topUp);
              if (err.message === "ALREADY_MARKED") {
                console.log(`   -> skipped (already backfilled by a previous run).`);
              } else if (err.message === "NO_SELLER_DOC") {
                console.error(`   -> FAILED, rolled back: no Seller document for user ${sellerKey} — needs manual admin credit of ₦${topUp}.`);
              } else {
                console.error(`   -> FAILED, rolled back: ${err.message}`);
              }
            } finally {
              session.endSession();
            }
          }
        } else {
          // Still-open order — just pre-stage sellerPayoutPrice, no money moves yet.
          console.log(`[open]      order ${order._id} item ${item._id} (status: ${order.status}): pre-setting sellerPayoutPrice to ₦${fullPrice} for when it completes`);
          if (apply) {
            const result = await Orders.updateOne(
              { _id: order._id, items: { $elemMatch: { _id: item._id, sellerPayoutPrice: { $exists: false } } } },
              { $set: { "items.$.sellerPayoutPrice": fullPrice } }
            );
            if (result.modifiedCount === 1) { markedOpenCount.n++; console.log(`   -> marked.`); }
            else console.log(`   -> skipped (already marked by a previous run).`);
          } else {
            markedOpenCount.n++;
          }
        }
      }
    }
  }

  console.log(`\nSkipped: ${skippedVariant} variant item(s), ${skippedNegotiated} negotiated-price item(s), ${skippedCeiling} above the price ceiling, ${skippedPriceMismatch} that didn't match the product's recorded price.`);
  console.log(`Still-open items ${apply ? "pre-staged" : "that would be pre-staged"}: ${markedOpenCount.n}`);

  if (creditedBySeller.size === 0 && markedOpenCount.n === 0) {
    console.log("\nNothing to backfill.");
    await mongoose.disconnect();
    return;
  }

  if (creditedBySeller.size) {
    console.log(`\nCompleted-order credits ${apply ? "applied" : "that would be applied"}:`);
    for (const [sellerKey, total] of creditedBySeller) {
      console.log(`  ${await sellerName(sellerKey)}: +₦${total.toLocaleString()}`);
    }
  }

  console.log(apply
    ? "\nDone."
    : "\nDry run only — nothing was changed. Re-run with --apply to write these changes for real.");

  await mongoose.disconnect();
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
