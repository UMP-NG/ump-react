import crypto from "crypto";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import logger from "../utils/logger.js";
import { confirmAllOrders } from "../utils/confirmOrders.js";
import { notify } from "../utils/notify.js";

export const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body);

    // ── Buyer payment received ─────────────────────────────────────────────────
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      const payment = await Payment.findOne({ reference });
      if (payment) {
        // Guard against amount mismatch — only confirm if Paystack amount matches what we recorded
        const paidKobo     = Math.round(data.amount);          // Paystack sends kobo
        const expectedKobo = Math.round(payment.amount * 100); // stored in naira
        if (Math.abs(paidKobo - expectedKobo) > 100) {         // allow ±₦1 rounding tolerance
          logger.error(`[paystackWebhook] Amount mismatch on ${reference}: expected ${expectedKobo} kobo, got ${paidKobo}`);
          return res.sendStatus(200); // ack to prevent Paystack retries; do NOT confirm
        }

        payment.status = "success";
        payment.paidAt = new Date();
        payment.metadata = data;
        await payment.save();

        // confirmAllOrders handles order status update + buyer/seller notifications
        await confirmAllOrders({ orders: [payment.order] });
      }
    }

    // ── Escrow payout transferred to seller ───────────────────────────────────
    if (event.event === "transfer.success") {
      const data = event.data;
      const ref = data.reference; // e.g. "ESCROW_<orderId>_<ts>"

      if (ref?.startsWith("ESCROW_")) {
        const parts = ref.split("_");
        const orderId = parts[1];

        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = "released";
          order.status = "completed";
          order.escrowReleasedAt = new Date();
          await order.save();

          // Clear the pending payout entry we added optimistically
          const seller = await Seller.findOne({ user: order.seller });
          if (seller) {
            await Seller.findByIdAndUpdate(seller._id, {
              $set: { "payoutHistory.$[el].status": "paid" },
            }, {
              arrayFilters: [{ "el.referenceId": ref }],
            });
          }

          // Notify seller their payout landed
          if (order.seller) {
            notify(order.seller, {
              type: "payout",
              title: "Payout sent!",
              message: `Your escrow payout for order #${orderId.toString().slice(-6).toUpperCase()} has been transferred to your bank account.`,
              link: "/seller-dashboard",
            }).catch(() => {});
          }
        }
      }
    }

    // ── Escrow payout failed ───────────────────────────────────────────────────
    if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
      const data = event.data;
      const ref = data.reference;

      if (ref?.startsWith("ESCROW_")) {
        const parts = ref.split("_");
        const orderId = parts[1];

        // Revert order back to paid so seller can retry
        const failedOrder = await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          status: "shipped",
          deliveryCodeUsed: false,
        }, { new: false });

        logger.error(`⚠️ Transfer failed for order ${orderId}, ref ${ref}. Reverted to paid/shipped for retry.`);

        // Update the matching payout history entry directly (no stray findOne({}) with no filter)
        await Seller.findOneAndUpdate(
          { "payoutHistory.referenceId": ref },
          { $set: { "payoutHistory.$.status": "failed" } }
        );

        // Notify seller their payout failed
        if (failedOrder?.seller) {
          notify(failedOrder.seller, {
            type: "payout",
            title: "Payout transfer failed",
            message: `Your payout transfer for order #${orderId.toString().slice(-6).toUpperCase()} failed. Please contact support — we'll retry or resolve it.`,
            link: "/seller-dashboard",
          }).catch(() => {});
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    logger.error("Webhook error:", err.message);
    return res.sendStatus(500);
  }
};

