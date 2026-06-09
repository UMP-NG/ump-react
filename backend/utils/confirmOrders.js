import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import { notify } from "./notify.js";

export async function confirmAllOrders(payment) {
  const orderIds = payment.orders?.length ? payment.orders : [];
  let buyerNotified = false;
  let buyerIdForCartClear = null;
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
      buyerNotified = true;
    }
    if (o.seller) {
      notify(o.seller, {
        type: "order",
        title: "New order received",
        message: `Payment confirmed for order #${shortId} — ₦${o.totalAmount.toLocaleString()}. Ready to fulfil.`,
        link: "/seller-dashboard",
      });
      await Seller.findOneAndUpdate({ user: o.seller }, { $inc: { totalOrders: 1 } });
    }
  }
  // Clear the buyer's cart now that payment is confirmed
  if (buyerIdForCartClear) {
    await Cart.findOneAndUpdate({ user: buyerIdForCartClear }, { $set: { items: [] } });
  }
}
