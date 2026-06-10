import Order from "../models/Order.js";
import User from "../models/User.js";
import { notify } from "./notify.js";
import logger from "./logger.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const RUN_INTERVAL_MS = 60 * 60 * 1000; // check every hour

async function cancelStalePaidOrders() {
  try {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

    // Orders that were paid but the seller never confirmed within 7 days
    const stale = await Order.find({
      paymentStatus: "paid",
      status: "pending",
      createdAt: { $lt: cutoff },
    }).lean();

    if (!stale.length) return;

    const orderIds = stale.map((o) => o._id);

    await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          status: "cancelled",
          notes: "Auto-cancelled: seller did not respond within 7 days.",
        },
      }
    );

    // Notify each buyer and flag for admin
    const adminUsers = await User.find({ roles: "admin" }).select("_id").lean();

    for (const order of stale) {
      // Notify buyer
      if (order.buyer) {
        await notify(order.buyer, {
          type: "order",
          title: "Order cancelled",
          message: `Your order was cancelled because the seller did not respond within 7 days. A refund will be processed shortly.`,
          link: `/orders/${order._id}`,
        }).catch(() => {});
      }

      // Notify all admin accounts
      for (const admin of adminUsers) {
        await notify(admin._id, {
          type: "account",
          title: "Order auto-cancelled",
          message: `Order #${order._id} was auto-cancelled after 7 days of no seller response. Buyer refund may be required.`,
          link: `/admin/orders`,
        }).catch(() => {});
      }

      logger.warn(`[autoCancel] Order ${order._id} cancelled — seller ${order.seller} did not respond within 7 days.`);
    }

    logger.info(`[autoCancel] Cancelled ${stale.length} stale order(s).`);
  } catch (err) {
    logger.error("[autoCancel] Error during stale order check:", err.message);
  }
}

export function startAutoCancelJob() {
  // Run once immediately after startup, then every hour
  cancelStalePaidOrders();
  setInterval(cancelStalePaidOrders, RUN_INTERVAL_MS);
  logger.info("[autoCancel] Stale-order cancellation job started (runs every hour).");
}
