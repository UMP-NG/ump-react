import axios from "axios";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import { audit } from "../utils/auditLog.js";
import { confirmAllOrders } from "../utils/confirmOrders.js";
import logger from "../utils/logger.js";

const FLW_BASE = "https://api.flutterwave.com/v3";

function flwHeaders() {
  return { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` };
}

function clientUrl() {
  return process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL || "https://myump.com.ng"
    : "http://localhost:5173";
}

// ----------------------------
// 1️⃣ Initialize Flutterwave Payment
// ----------------------------
export const initializeFlwPayment = async (req, res) => {
  try {
    // Accept either a single orderId (legacy) or an orderIds array (multi-seller)
    const rawIds = req.body.orderIds || (req.body.orderId ? [req.body.orderId] : []);
    if (!rawIds.length)
      return res.status(400).json({ success: false, message: "orderIds required" });

    const orders = await Order.find({ _id: { $in: rawIds }, buyer: req.user._id });
    if (!orders.length)
      return res.status(404).json({ success: false, message: "Orders not found" });

    const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
    const reference = `UMP_FLW_${Date.now()}`;
    const base = clientUrl();

    const response = await axios.post(
      `${FLW_BASE}/payments`,
      {
        tx_ref: reference,
        amount: totalAmount,
        currency: "NGN",
        redirect_url: `${base}/payment-success`,
        customer: {
          email: req.user.email,
          name: req.user.name || req.user.email,
          phonenumber: req.user.phone || "",
        },
        meta: { orderIds: orders.map((o) => o._id.toString()).join(",") },
        customizations: {
          title: "UMP Marketplace",
          description: "Secure escrow payment",
          logo: `${base}/images/ump-apple-touch-icon.png`,
        },
      },
      { headers: flwHeaders() }
    );

    const paymentLink = response.data?.data?.link;
    if (!paymentLink)
      throw new Error("No payment link returned from Flutterwave");

    await Payment.create({
      orders: orders.map((o) => o._id),
      user: req.user._id,
      provider: "Flutterwave",
      amount: totalAmount,
      reference,
      status: "pending",
    });

    return res.json({ success: true, payment_link: paymentLink, reference });
  } catch (err) {
    logger.error("💥 Flutterwave init error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
      error: err.response?.data || err.message,
    });
  }
};

// ----------------------------
// 2️⃣ Verify Flutterwave Payment (after redirect)
// ----------------------------
export const verifyFlwPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id)
      return res.status(400).json({ success: false, message: "transaction_id missing" });

    const response = await axios.get(
      `${FLW_BASE}/transactions/${transaction_id}/verify`,
      { headers: flwHeaders() }
    );

    const data = response.data?.data;
    if (!data)
      return res.status(400).json({ success: false, message: "Invalid Flutterwave response" });

    // Atomically claim this payment — prevents race with webhook
    const payment = await Payment.findOneAndUpdate(
      { reference: data.tx_ref, status: "pending" },
      { $set: { status: "processing" } },
      { new: false }
    );

    if (!payment) {
      // Already processing or finalised — idempotent response
      const existing = await Payment.findOne({ reference: data.tx_ref });
      if (!existing)
        return res.status(404).json({ success: false, message: "Payment record not found" });
      return res.json({ success: true, message: "Payment already processed", status: existing.status, orderId: existing.orders?.[0] });
    }

    // Amount validation (Flutterwave returns amount in naira)
    const expectedAmount = payment.amount;
    if (data.status === "successful" && Math.abs(data.amount - expectedAmount) > 1) {
      await Payment.findOneAndUpdate({ reference: data.tx_ref }, { $set: { status: "failed" } });
      await audit("PAYMENT_AMOUNT_MISMATCH", {
        actor: req.user?._id,
        entity: "Payment",
        entityId: payment._id,
        meta: { expected: expectedAmount, received: data.amount, reference: data.tx_ref },
        req,
        status: "fail",
      });
      return res.status(400).json({ success: false, message: "Payment amount mismatch. Contact support." });
    }

    const succeeded = data.status === "successful";
    await Payment.findOneAndUpdate(
      { reference: data.tx_ref },
      { $set: { status: succeeded ? "success" : "failed", paidAt: succeeded ? new Date() : null, metadata: data } }
    );
    payment.status = succeeded ? "success" : "failed";

    let orderSummaries = [];
    if (succeeded) {
      await confirmAllOrders(payment);
      audit("PAYMENT_VERIFIED", {
        actor: req.user?._id,
        entity: "Payment",
        entityId: payment._id,
        amount: payment.amount,
        meta: { reference: payment.reference, provider: "Flutterwave", transaction_id },
        req,
      });
      const allIds = payment.orders?.length ? payment.orders : [payment.order];
      const confirmedOrders = await Order.find({ _id: { $in: allIds } }).lean();
      const sellerIds = [...new Set(confirmedOrders.map((o) => o.seller?.toString()).filter(Boolean))];
      const profiles = await Seller.find({ user: { $in: sellerIds } }).select("user storeName").lean();
      const nameMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p.storeName || ""]));
      orderSummaries = confirmedOrders.map((o) => ({
        _id: o._id,
        storeName: o.seller ? (nameMap[o.seller.toString()] || "") : "",
        totalAmount: o.totalAmount,
      }));
    }

    return res.json({
      success: true,
      message: "Payment verified",
      status: payment.status,
      orderId: payment.orders?.[0],
      orderIds: payment.orders,
      orders: orderSummaries,
    });
  } catch (err) {
    logger.error("💥 Flutterwave verify error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.response?.data || err.message,
    });
  }
};

// ----------------------------
// 3️⃣ Flutterwave Webhook
// ----------------------------
export const flutterwaveWebhook = async (req, res) => {
  try {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    const hash   = req.headers["verif-hash"];
    // Use constant-time comparison to prevent timing side-channel leaks
    if (!hash || !secret ||
        hash.length !== secret.length ||
        !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(secret))) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.completed" && event.data?.status === "successful") {
      const data = event.data;
      const orderId = data.meta?.orderId;

      // Atomically claim — prevents double-processing with verifyFlwPayment
      const payment = await Payment.findOneAndUpdate(
        { reference: data.tx_ref, status: "pending" },
        { $set: { status: "processing" } },
        { new: false }
      );

      if (payment && Math.abs(data.amount - payment.amount) <= 1) {
        await Payment.findOneAndUpdate(
          { reference: data.tx_ref },
          { $set: { status: "success", paidAt: new Date(), metadata: data } }
        );
        await confirmAllOrders(payment);
        audit("WEBHOOK_PAYMENT_CONFIRMED", {
          entity: "Payment",
          entityId: payment._id,
          amount: data.amount,
          meta: { reference: data.tx_ref, provider: "Flutterwave" },
          req,
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error("💥 Flutterwave webhook error:", err);
    res.sendStatus(500);
  }
};
