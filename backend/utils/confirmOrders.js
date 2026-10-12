import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { notify } from "./notify.js";
import sendMail from "./sendMail.js";
import logger from "./logger.js";
import { recordPromotionSale } from "../controllers/promotionController.js";

// These emails go to real paying customers, so the fallback must never be a
// localhost link in production — matches the pattern already used in
// paymentController.js for the same reason.
const CLIENT_URL = process.env.NODE_ENV === "production"
  ? (process.env.CLIENT_URL || "https://myump.com.ng")
  : (process.env.CLIENT_URL || "http://localhost:5173");

export async function confirmAllOrders(payment) {
  const orderIds = payment.orders?.length ? payment.orders : [];
  let buyerNotified = false;
  let buyerIdForCartClear = null;
  let buyerId = null;
  // Accumulate every order per seller so a buyer checking out a multi-seller
  // cart results in one consolidated email per seller listing ALL of their
  // orders from this payment, not just whichever order happened to be
  // processed first for them.
  const sellerOrders = new Map(); // sellerId string -> [shortId, ...]
  const allShortIds = [];
  for (const orderId of orderIds) {
    const o = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: "paid", status: "confirmed" },
      { new: true }
    );
    if (!o) continue;
    if (!buyerIdForCartClear) buyerIdForCartClear = o.buyer;
    if (!buyerId) buyerId = o.buyer;
    const shortId = o._id.toString().slice(-6).toUpperCase();
    allShortIds.push(shortId);

    // Count paid units against any admin Promotion still active on these
    // products — reverting/notifying once a promo's unit cap is reached.
    // Checked against the product's CURRENT activePromotion (not something
    // snapshotted at cart time), so a promo that already ended between
    // checkout and payment is correctly not credited.
    const productIds = [...new Set(o.items.map((i) => (i.product?._id || i.product)?.toString()).filter(Boolean))];
    if (productIds.length) {
      const promoted = await Product.find({ _id: { $in: productIds }, activePromotion: { $ne: null } })
        .select("_id activePromotion").lean();
      if (promoted.length) {
        const promoByProduct = new Map(promoted.map((p) => [p._id.toString(), p.activePromotion.toString()]));
        for (const item of o.items) {
          const pid = (item.product?._id || item.product)?.toString();
          const promotionId = pid && promoByProduct.get(pid);
          // Awaited — a fire-and-forget call here could be cut short by a
          // process restart/deploy before the unit count (and the revert it
          // can trigger) is actually committed, letting the store oversell
          // past its promo cap indefinitely.
          if (promotionId) await recordPromotionSale(promotionId, item.quantity || 1);
        }
      }
    }
    if (!buyerNotified) {
      notify(o.buyer, {
        type: "order",
        title: "Payment confirmed!",
        message: orderIds.length > 1
          ? `Your payment was successful. ${orderIds.length} orders are now being processed.`
          : `Your payment for order #${shortId} was successful. The seller has been notified.`,
        link: "/orders",
      });
      buyerNotified = true;
    }
    if (o.seller) {
      notify(o.seller, {
        type: "order",
        title: "New order received",
        message: `Payment confirmed for order #${shortId}. Product payment will be released when the buyer confirms delivery.`,
        link: "/seller-dashboard",
      });
      const sellerIdStr = o.seller.toString();
      if (!sellerOrders.has(sellerIdStr)) sellerOrders.set(sellerIdStr, []);
      sellerOrders.get(sellerIdStr).push(shortId);
      await Seller.findOneAndUpdate(
        { user: o.seller },
        { $inc: { totalOrders: 1 } }
      );
    }
  }

  // One consolidated email to the buyer, listing every order from this payment.
  if (buyerId) {
    User.findById(buyerId).select("email").lean()
      .then((buyerUser) => {
        if (!buyerUser?.email) return;
        return sendMail({
          email: buyerUser.email,
          subject: "Your UMP order is confirmed",
          message: allShortIds.length > 1
            ? `Your payment was successful. ${allShortIds.length} orders (#${allShortIds.join(", #")}) are now being processed. View your orders at ${CLIENT_URL}/orders.`
            : `Your payment for order #${allShortIds[0]} was successful. The seller has been notified and your order is now being processed. View your order at ${CLIENT_URL}/orders.`,
        });
      })
      .catch((err) => logger.error("confirmAllOrders buyer email:", err.message));
  }

  // One consolidated email per seller, listing every one of their orders
  // from this payment.
  for (const [sellerIdStr, shortIds] of sellerOrders) {
    User.findById(sellerIdStr).select("email").lean()
      .then((sellerUser) => {
        if (!sellerUser?.email) return;
        return sendMail({
          email: sellerUser.email,
          subject: "You've received a new order on UMP",
          message: shortIds.length > 1
            ? `Payment confirmed for ${shortIds.length} orders (#${shortIds.join(", #")}). Funds will be released to your wallet once the buyer confirms delivery for each. View them at ${CLIENT_URL}/seller-dashboard.`
            : `Payment confirmed for order #${shortIds[0]}. Funds will be released to your wallet once the buyer confirms delivery. View it at ${CLIENT_URL}/seller-dashboard.`,
        });
      })
      .catch((err) => logger.error("confirmAllOrders seller email:", err.message));
  }

  // Clear the buyer's cart now that payment is confirmed — non-fatal if it fails
  if (buyerIdForCartClear) {
    try {
      await Cart.findOneAndUpdate({ user: buyerIdForCartClear }, { $set: { items: [] } });
    } catch (cartErr) {
      console.warn("confirmAllOrders: cart clear failed for", buyerIdForCartClear, cartErr.message);
    }
  }
}
