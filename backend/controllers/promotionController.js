import mongoose from "mongoose";
import Promotion from "../models/Promotion.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

// Store promotions are meant for lower-priced items only — keeps the feature
// scoped to impulse/volume buys rather than discounting big-ticket products.
const PROMOTABLE_PRICE_CEILING = 10000;

async function notifyAdmins(title, message) {
  try {
    const admins = await User.find({ roles: "admin" }, { _id: 1 }).lean();
    await Promise.all(admins.map((a) =>
      notify(a._id, { type: "account", title, message, link: "/admin/promotions" })
    ));
  } catch (err) {
    logger.error("notifyAdmins (promotions):", err.message);
  }
}

// Clears the discount from every product still pointing at this exact
// promotion (a product that was moved into a newer promotion in the
// meantime is left alone — never stomp on a different, still-active promo).
async function revertPromotionProducts(promotion) {
  await Product.updateMany(
    { _id: { $in: promotion.products }, activePromotion: promotion._id },
    { $set: { salePrice: null, saleEndsAt: null, activePromotion: null } }
  );
}

// Populates + shapes a single promotion the same way listPromotions shapes
// its rows, so a freshly created or cancelled promotion returned to the
// frontend carries a store name instead of a bare seller ObjectId.
async function shapePromotion(promotionId) {
  const promotion = await Promotion.findById(promotionId)
    .populate("seller", "name email")
    .populate("products", "name price images")
    .lean();
  if (!promotion) return null;
  if (promotion.seller) {
    const sellerDoc = await Seller.findOne({ user: promotion.seller._id }).select("storeName").lean();
    promotion.seller = { ...promotion.seller, storeName: sellerDoc?.storeName || promotion.seller.name };
  }
  return promotion;
}

// GET /api/promotions — admin-only, every promotion
export const listPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .sort({ createdAt: -1 })
      .populate("seller", "name email")
      .populate("products", "name price images")
      .lean();
    const sellerUserIds = [...new Set(promotions.map((p) => p.seller?._id?.toString()).filter(Boolean))];
    const sellerDocs = sellerUserIds.length
      ? await Seller.find({ user: { $in: sellerUserIds } }).select("user storeName").lean()
      : [];
    const storeMap = Object.fromEntries(sellerDocs.map((s) => [s.user.toString(), s.storeName]));
    const shaped = promotions.map((p) => ({
      ...p,
      seller: p.seller ? { ...p.seller, storeName: storeMap[p.seller._id.toString()] || p.seller.name } : null,
    }));
    res.json({ promotions: shaped });
  } catch (err) {
    logger.error("listPromotions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/promotions — admin-only
export const createPromotion = async (req, res) => {
  try {
    const { seller, productIds, discountPercent, maxUnits, durationDays } = req.body;

    if (!seller || !mongoose.Types.ObjectId.isValid(seller)) {
      return res.status(400).json({ message: "A valid store (seller) is required" });
    }
    if (!Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ message: "Select at least one product" });
    }
    const validProductIds = productIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validProductIds.length) {
      return res.status(400).json({ message: "No valid product ids provided" });
    }
    if (validProductIds.length !== productIds.length) {
      return res.status(400).json({ message: "One or more selected product ids are invalid" });
    }
    const pct = Number(discountPercent);
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) {
      return res.status(400).json({ message: "Discount must be a percentage between 1 and 95" });
    }
    const units = Number(maxUnits);
    if (!Number.isInteger(units) || units < 1) {
      return res.status(400).json({ message: "Max units must be a positive whole number" });
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1) {
      return res.status(400).json({ message: "Duration must be at least 1 day" });
    }

    // Only allow products that actually belong to the chosen store, cost
    // under the promo price cap, and have no priced variants — a variant's
    // real price comes from its own price, not this top-level `price` field,
    // so a discount computed from `price` here would never actually apply
    // at checkout.
    const products = await Product.find({
      _id: { $in: validProductIds },
      seller,
      price: { $lt: PROMOTABLE_PRICE_CEILING },
      $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
    }).select("_id price");
    if (products.length !== validProductIds.length) {
      return res.status(400).json({ message: `One or more selected products are ineligible — they must belong to this store, cost under ₦${PROMOTABLE_PRICE_CEILING.toLocaleString("en-NG")}, and have no priced variants` });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
    const eligibleProductIds = products.map((p) => p._id);

    // Detaching these products from any older active promotion, creating the
    // new promotion, and pointing the products at it must all succeed or all
    // fail together — otherwise a mid-sequence failure can leave a product
    // detached from its old promotion with no new one to replace it, or a
    // promotion with products that were never actually discounted.
    let promotion;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Promotion.updateMany(
          { status: "active", products: { $in: eligibleProductIds } },
          { $pull: { products: { $in: eligibleProductIds } } },
          { session }
        );

        const [created] = await Promotion.create([{
          seller,
          products: eligibleProductIds,
          discountPercent: pct,
          maxUnits: units,
          startsAt,
          endsAt,
          status: "active",
          createdBy: req.user._id,
        }], { session });
        promotion = created;

        // Apply the discount to each product now — percentage-based, computed
        // from each product's own current price. Run one at a time: a single
        // ClientSession can't have multiple operations in flight concurrently.
        for (const p of products) {
          const salePrice = Math.round(p.price * (1 - pct / 100));
          await Product.findByIdAndUpdate(p._id, {
            salePrice,
            saleEndsAt: endsAt,
            activePromotion: promotion._id,
          }, { session });
        }
      });
    } finally {
      session.endSession();
    }

    res.status(201).json({ promotion: await shapePromotion(promotion._id) });
  } catch (err) {
    logger.error("createPromotion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/promotions/:id — admin-only, ends a promotion early
export const cancelPromotion = async (req, res) => {
  try {
    // Atomically claim the active -> cancelled transition so a concurrent
    // depletion (recordPromotionSale) or expiry (checkExpiredPromotions)
    // can't both revert the products and stomp on each other's status.
    const promotion = await Promotion.findOneAndUpdate(
      { _id: req.params.id, status: "active" },
      { $set: { status: "cancelled" } },
      { new: true }
    );
    if (!promotion) {
      const existing = await Promotion.findById(req.params.id).select("status").lean();
      if (!existing) return res.status(404).json({ message: "Promotion not found" });
      return res.status(400).json({ message: `Promotion is already ${existing.status}` });
    }
    await revertPromotionProducts(promotion);
    res.json({ message: "Promotion cancelled", promotion: await shapePromotion(promotion._id) });
  } catch (err) {
    logger.error("cancelPromotion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/promotions/:id — admin-only, edits discount/cap/duration on a
// still-active promotion (editing a terminal-status one doesn't make sense).
export const updatePromotion = async (req, res) => {
  try {
    const { discountPercent, maxUnits, durationDays } = req.body;

    const pct = Number(discountPercent);
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) {
      return res.status(400).json({ message: "Discount must be a percentage between 1 and 95" });
    }
    const units = Number(maxUnits);
    if (!Number.isInteger(units) || units < 1) {
      return res.status(400).json({ message: "Max units must be a positive whole number" });
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days < 1) {
      return res.status(400).json({ message: "Duration must be at least 1 day" });
    }

    const existing = await Promotion.findById(req.params.id).select("status unitsSold").lean();
    if (!existing) return res.status(404).json({ message: "Promotion not found" });
    if (existing.status !== "active") {
      return res.status(400).json({ message: `Cannot edit a promotion that is already ${existing.status}` });
    }
    if (units < existing.unitsSold) {
      return res.status(400).json({ message: `Max units can't be less than the ${existing.unitsSold} already sold` });
    }

    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    let promotion;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Atomically re-claim "active" so a concurrent cancel/depletion/expiry
        // can't be overwritten by this edit.
        promotion = await Promotion.findOneAndUpdate(
          { _id: req.params.id, status: "active" },
          { $set: { discountPercent: pct, maxUnits: units, endsAt } },
          { new: true, session }
        );
        if (!promotion) return;

        // activePromotion guard — same reasoning as revertPromotionProducts:
        // a product can have been detached from this promotion's own array
        // and claimed by a newer one in the gap between our read of `existing`
        // above and this transaction. Only touch products still actually tied
        // back to this promotion, never overwrite a different, newer promo's price.
        const products = await Product.find({
          _id: { $in: promotion.products },
          activePromotion: promotion._id,
        }).select("_id price").session(session);
        // Re-price each product from its own current price and push the new
        // end date — one at a time, a ClientSession can't run operations
        // concurrently.
        for (const p of products) {
          const salePrice = Math.round(p.price * (1 - pct / 100));
          await Product.findByIdAndUpdate(p._id, { salePrice, saleEndsAt: endsAt }, { session });
        }
      });
    } finally {
      session.endSession();
    }

    if (!promotion) {
      const latest = await Promotion.findById(req.params.id).select("status").lean();
      return res.status(400).json({ message: `Cannot edit a promotion that is already ${latest?.status || "no longer active"}` });
    }

    res.json({ message: "Promotion updated", promotion: await shapePromotion(promotion._id) });
  } catch (err) {
    logger.error("updatePromotion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/promotions/:id/permanent — admin-only, permanently removes a
// promotion record. Only once it's no longer active: deleting an active
// promotion's document without reverting first would leave its products
// stuck at the discounted price forever (nothing left to revert them).
export const deletePromotion = async (req, res) => {
  try {
    const existing = await Promotion.findById(req.params.id).select("status").lean();
    if (!existing) return res.status(404).json({ message: "Promotion not found" });
    if (existing.status === "active") {
      return res.status(400).json({ message: "End this promotion before deleting it" });
    }
    await Promotion.deleteOne({ _id: req.params.id });
    res.json({ message: "Promotion deleted" });
  } catch (err) {
    logger.error("deletePromotion:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Called from confirmOrders.js whenever a promoted product's order is paid
// for — increments the promotion's unit counter and reverts/notifies once
// the cap is reached. Exported for reuse, not an HTTP handler.
export async function recordPromotionSale(promotionId, quantity) {
  try {
    const promotion = await Promotion.findOneAndUpdate(
      { _id: promotionId, status: "active" },
      { $inc: { unitsSold: quantity } },
      { new: true }
    );
    if (!promotion) return;
    if (promotion.unitsSold >= promotion.maxUnits) {
      // Claim the active -> depleted transition atomically before reverting,
      // so a concurrent cancel/expiry can't both revert and overwrite status.
      const claimed = await Promotion.findOneAndUpdate(
        { _id: promotionId, status: "active" },
        { $set: { status: "depleted" } },
        { new: true }
      );
      if (!claimed) return;
      await revertPromotionProducts(claimed);
      const seller = await Seller.findOne({ user: claimed.seller }).select("storeName").lean();
      await notifyAdmins(
        "Promotion sold out",
        `"${seller?.storeName || "A store"}'s" ${claimed.discountPercent}% promo hit its ${claimed.maxUnits}-unit limit and has reverted to normal pricing.`
      );
    }
  } catch (err) {
    logger.error("recordPromotionSale:", err.message);
  }
}

// Called from the hourly cron in server.js — reverts and notifies for every
// promotion whose duration has run out, independent of whether it sold out.
export async function checkExpiredPromotions() {
  try {
    const candidates = await Promotion.find({ status: "active", endsAt: { $lte: new Date() } }).select("_id");
    let count = 0;
    for (const c of candidates) {
      // Claim the active -> expired transition atomically — a concurrent
      // cancel or depletion may have already won the race for this one.
      const promotion = await Promotion.findOneAndUpdate(
        { _id: c._id, status: "active" },
        { $set: { status: "expired" } },
        { new: true }
      );
      if (!promotion) continue;
      await revertPromotionProducts(promotion);
      count++;
      const seller = await Seller.findOne({ user: promotion.seller }).select("storeName").lean();
      await notifyAdmins(
        "Promotion ended",
        `"${seller?.storeName || "A store"}'s" ${promotion.discountPercent}% promo has reached its end date and reverted to normal pricing.`
      );
    }
    return count;
  } catch (err) {
    logger.error("checkExpiredPromotions:", err.message);
    return 0;
  }
}
