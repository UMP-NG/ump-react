import crypto from "crypto";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";

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
        payment.status = "success";
        payment.paidAt = new Date();
        payment.metadata = data;
        await payment.save();

        await Order.findByIdAndUpdate(payment.order, {
          paymentStatus: "paid",
          status: "confirmed",
        });
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
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          status: "shipped",
          deliveryCodeUsed: false,
        });

        console.error(`⚠️ Transfer failed for order ${orderId}, ref ${ref}. Reverted to paid/shipped for retry.`);

        const seller = await Seller.findOne({});
        if (seller) {
          await Seller.findOneAndUpdate(
            { "payoutHistory.referenceId": ref },
            { $set: { "payoutHistory.$.status": "failed" } }
          );
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.sendStatus(500);
  }
};
