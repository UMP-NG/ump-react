// One-off backfill: tops up sellers who were underpaid on already-completed
// orders because an admin-created store Promotion discounted their product.
// Before this fix, sellers were paid on the DISCOUNTED price the buyer paid,
// even when the discount was the admin's decision, not theirs. Sellers
// should always receive the full price for an admin promo — the platform
// absorbs the gap. Seller-set sales (no Promotion involved) are untouched;
// those correctly pay out at the discounted price, same as always.
//
// Usage (run from the backend/ folder):
//   node scripts/backfillPromoPayouts.mjs              (dry run — report only)
//   node scripts/backfillPromoPayouts.mjs --apply       (credits sellers for real)
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
// Only items that have ALREADY been paid out are touched — i.e. items on an
// order with status "completed", or individual items with status
// "completed" on a "partial" order. An order that only reached "confirmed"
// (or any other non-terminal status) was never paid out in the first place,
// so there's nothing to backfill there — the code fix now in place will pay
// it correctly whenever it does complete.
//
// Safety checks against false positives (a matching product + time window
// does NOT by itself prove this specific item's price came from the promo):
//   - Variant purchases are skipped — variants never carry promo pricing
//     (see createPromotion's own eligibility rule), so item.price there is
//     unrelated to any promotion's discount no matter how it looks on paper.
//   - Items matching an accepted/applied Negotiation (same buyer, product,
//     and price) are skipped — a negotiated price has nothing to do with
//     the promo, even though the reverse-discount formula would still
//     "compute" a plausible-looking (but fabricated) shortfall for it.
//   - The reverse-computed full price must be under the promo price ceiling
//     (₦10,000) — createPromotion never allows a product costing more than
//     that into a promotion, so a reverse-computed price at or above it
//     cannot have actually come from this promotion's discount.
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const apply = process.argv.includes("--apply");
const PROMOTABLE_PRICE_CEILING = 10000; // must match promotionController.js

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const Promotions   = mongoose.connection.collection("promotions");
  const Orders       = mongoose.connection.collection("orders");
  const Sellers      = mongoose.connection.collection("sellers");
  const Config       = mongoose.connection.collection("configs");
  const Negotiations = mongoose.connection.collection("negotiations");

  const cfgDoc = await Config.findOne({});
  // Matches getFeeConfig() in orderController.js — fields live under `fees`,
  // and platformFee is a PERCENTAGE (e.g. 5.0), not a 0-1 fraction.
  const platformFeeEnabled = cfgDoc?.fees?.platformFeeEnabled ?? false;
  const platformFeeRate = (cfgDoc?.fees?.platformFee ?? 5.0) / 100;
  console.log(`Platform fee: ${platformFeeEnabled ? `${(platformFeeRate * 100).toFixed(1)}%` : "disabled"}\n`);

  const promotions = await Promotions.find({}).toArray();
  console.log(`Found ${promotions.length} promotion(s) ever created.\n`);

  // seller userId (string) -> store name, for the summary printout only
  const sellerNames = new Map();
  const sellerCredited = new Map(); // seller userId (string) -> running total credited, for the printout
  let touchedItems = 0;
  let skippedVariant = 0;
  let skippedNegotiated = 0;
  let skippedCeiling = 0;

  for (const promo of promotions) {
    if (!promo.products?.length) continue;
    const orders = await Orders.find({
      "items.product": { $in: promo.products },
      createdAt: { $gte: promo.startsAt, $lte: promo.endsAt },
      status: { $in: ["completed", "partial"] },
    }).toArray();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product?.toString();
        if (!productId || !promo.products.some((p) => p.toString() === productId)) continue;

        // Variants never carry promo pricing — this item's price has nothing
        // to do with the promotion no matter how it looks numerically.
        if (item.variant?.sku) { skippedVariant++; continue; }

        // Already paid out?
        const alreadyPaid = order.status === "completed" || item.status === "completed";
        if (!alreadyPaid) continue;
        // Already backfilled (safe to re-run)?
        if (item.sellerPayoutPrice != null) continue;
        if (!item.price || item.price <= 0) continue;

        const fullPrice = Math.round(item.price / (1 - promo.discountPercent / 100));
        if (fullPrice <= item.price) continue; // nothing owed

        // A negotiated price is unrelated to the promo — skip if this exact
        // buyer/product/price combination matches an accepted negotiation.
        const negotiated = await Negotiations.findOne({
          item: item.product,
          buyer: order.buyer,
          proposedPrice: item.price,
          status: { $in: ["accepted", "applied"] },
        });
        if (negotiated) { skippedNegotiated++; continue; }

        // No promotable product ever costs this much — a reverse-computed
        // price at or above the ceiling can't be a real promo price.
        if (fullPrice >= PROMOTABLE_PRICE_CEILING) { skippedCeiling++; continue; }

        const shortfallPerUnit = fullPrice - item.price;
        const shortfall = shortfallPerUnit * (item.quantity || 1);
        const topUp = platformFeeEnabled ? Math.floor(shortfall * (1 - platformFeeRate)) : Math.floor(shortfall);
        if (topUp <= 0) continue;

        const sellerKey = (order.seller || "").toString();
        if (!sellerKey) continue;

        if (!sellerNames.has(sellerKey)) {
          const sellerDoc = await Sellers.findOne({ user: new mongoose.Types.ObjectId(sellerKey) });
          sellerNames.set(sellerKey, sellerDoc?.storeName || sellerKey);
        }

        console.log(`Seller ${sellerNames.get(sellerKey)} — order ${order._id} item ${item._id}: paid ₦${item.price} x${item.quantity || 1}, should be ₦${fullPrice} x${item.quantity || 1} → +₦${topUp}`);
        touchedItems++;
        sellerCredited.set(sellerKey, (sellerCredited.get(sellerKey) || 0) + topUp);

        if (apply) {
          // Mark the item and credit the seller atomically — if either half
          // fails, both roll back, so a re-run picks this item up cleanly
          // instead of silently under- or over-crediting on a partial write.
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              const markResult = await Orders.updateOne(
                { _id: order._id, "items._id": item._id, "items.sellerPayoutPrice": { $exists: false } },
                { $set: { "items.$.sellerPayoutPrice": fullPrice } },
                { session }
              );
              if (markResult.modifiedCount !== 1) {
                // Already marked by a concurrent/previous run — don't double-credit.
                throw new Error("ALREADY_MARKED");
              }
              await Sellers.updateOne(
                { user: new mongoose.Types.ObjectId(sellerKey) },
                {
                  $inc: { pendingPayout: topUp, totalRevenue: shortfall },
                  $push: { payoutHistory: { amount: topUp, status: "pending", referenceId: `PROMO_BACKFILL_${order._id}_${item._id}` } },
                },
                { session }
              );
            });
            console.log(`   -> credited.`);
          } catch (err) {
            if (err.message === "ALREADY_MARKED") {
              console.log(`   -> skipped (already backfilled by a previous run).`);
            } else {
              console.error(`   -> FAILED, rolled back: ${err.message}`);
            }
          } finally {
            session.endSession();
          }
        }
      }
    }
  }

  console.log(`\nSkipped: ${skippedVariant} variant item(s), ${skippedNegotiated} negotiated-price item(s), ${skippedCeiling} above the promo price ceiling.`);

  if (touchedItems === 0) {
    console.log("\nNothing to backfill — no underpaid admin-promo items found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\n${touchedItems} item(s) across ${sellerCredited.size} seller(s) ${apply ? "credited" : "need a top-up"}:`);
  for (const [sellerKey, total] of sellerCredited) {
    console.log(`  ${sellerNames.get(sellerKey)}: +₦${total.toLocaleString()}`);
  }

  console.log(apply
    ? "\nDone."
    : "\nDry run only — nothing was changed. Re-run with --apply to actually credit these sellers.");

  await mongoose.disconnect();
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
