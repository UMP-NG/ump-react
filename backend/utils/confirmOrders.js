import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import { notify } from "./notify.js";
import sendMail from "./sendMail.js";
import logger from "./logger.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

export async function confirmAllOrders(payment) {
  const orderIds = payment.orders?.length ? payment.orders : [];
  let buyerNotified = false;
  let buyerIdForCartClear = null;
  const emailedSellerIds = new Set();
  for (const orderId of orderIds) {
    const o = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: "paid", status: "confirmed" },
      { new: true }
    );
    if (!o) continue;
    if (!buyerIdForCartClear) buyerIdForCartClear = o.buyer;
    const shortId = o._id.toString().slice(-6).toUpperCase();
    if (!buyerNotified) {
      notify(o.buyer, {
        type: "order",
        title: "Payment confirmed!",
        message: orderIds.length > 1
          ? `Your payment was successful. ${orderIds.length} orders are now being processed.`
          : `Your payment for order #${shortId} was successful. The seller has been notified.`,
        link: "/orders",
      });
      User.findById(o.buyer).select("email").lean()
        .then((buyerUser) => {
          if (!buyerUser?.email) return;
          return sendMail({
            email: buyerUser.email,
            subject: "Your UMP order is confirmed",
            message: orderIds.length > 1
              ? `Your payment was successful. ${orderIds.length} orders are now being processed. View your orders at ${CLIENT_URL}/orders.`
              : `Your payment for order #${shortId} was successful. The seller has been notified and your order is now being processed. View your order at ${CLIENT_URL}/orders.`,
          });
        })
        .catch((err) => logger.error("confirmAllOrders buyer email:", err.message));
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
      if (!emailedSellerIds.has(sellerIdStr)) {
        emailedSellerIds.add(sellerIdStr);
        User.findById(o.seller).select("email").lean()
          .then((sellerUser) => {
            if (!sellerUser?.email) return;
            return sendMail({
              email: sellerUser.email,
              subject: "You've received a new order on UMP",
              message: `Payment confirmed for order #${shortId}. Funds will be released to your wallet once the buyer confirms delivery. View it at ${CLIENT_URL}/seller-dashboard.`,
            });
          })
          .catch((err) => logger.error("confirmAllOrders seller email:", err.message));
      }
      await Seller.findOneAndUpdate(
        { user: o.seller },
        { $inc: { totalOrders: 1 } }
      );
    }
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
