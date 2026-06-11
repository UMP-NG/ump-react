// backend/controllers/payments.js
import axios from "axios";
import paystack from "../utils/paystack.js";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import Config from "../models/Config.js";
import crypto from "crypto";
import { audit } from "../utils/auditLog.js";
import { confirmAllOrders } from "../utils/confirmOrders.js";
import logger from "../utils/logger.js";
import { encrypt, decrypt, mask } from "../utils/fieldEncryption.js";
import { notify } from "../utils/notify.js";
import { activateAdCampaign } from "./adController.js";

const FLW_BASE = "https://api.flutterwave.com/v3";
function flwHeaders() {
  return { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` };
}
function flwClientUrl() {
  return process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL || "https://myump.com.ng"
    : "http://localhost:5173";
}

// ─── Subscription helpers ─────────────────────────────────────────────────────
// Prices come from the Config document so admins can edit them without a deploy
async function getSubscriptionPrice(type, plan) {
  const config = await Config.findOne().select("subscriptions").lean();
  const price = config?.subscriptions?.[type]?.[plan]?.price;
  // Fall back to hardcoded defaults if config hasn't been saved yet
  const defaults = { monthly: 3000, annual: 25000 };
  return price ?? defaults[plan];
}

function subscriptionExpiresAt(plan) {
  const d = new Date();
  if (plan === "annual") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    // Add 30 days instead of setMonth(+1) to avoid month-end overflow
    // (e.g. Jan 31 + 1 month via setMonth would roll over to Mar 3)
    d.setDate(d.getDate() + 30);
  }
  return d;
}

async function activateSubscription(payment) {
  const { subscriptionPlan: plan, subscriptionType: type } = payment.metadata || {};
  if (!plan || !type) return;
  const expiresAt = subscriptionExpiresAt(plan);
  if (type === "seller") {
    await Seller.findOneAndUpdate(
      { user: payment.user },
      { isSubscribed: true, subscriptionPlan: plan, subscriptionExpiresAt: expiresAt }
    );
  } else if (type === "provider") {
    await User.findByIdAndUpdate(payment.user, {
      "serviceProviderInfo.isSubscribed":          true,
      "serviceProviderInfo.subscriptionPlan":      plan,
      "serviceProviderInfo.subscriptionExpiresAt": expiresAt,
    });
  }

  notify(payment.user, {
    type: "account",
    title: "Subscription activated!",
    message: `Your ${plan} ${type} subscription is now active.`,
    link: type === "provider" ? "/provider-dashboard" : "/seller-dashboard",
  }).catch(() => {});
}

// ─── Initialize subscription payment (Flutterwave) ───────────────────────────
export const initializeSubscriptionPayment = async (req, res) => {
  try {
    const { plan, type } = req.body;
    if (!["seller", "provider"].includes(type))
      return res.status(400).json({ success: false, message: "Invalid subscription type. Choose seller or provider." });
    if (!["monthly", "annual"].includes(plan))
      return res.status(400).json({ success: false, message: "Invalid plan. Choose monthly or annual." });

    const amount = await getSubscriptionPrice(type, plan);
    if (!amount)
      return res.status(400).json({ success: false, message: "Subscription pricing not configured. Contact support." });

    const txRef = `UMP_SUB_${Date.now()}_${req.user._id.toString().slice(-6)}`;
    const base  = flwClientUrl();

    const response = await axios.post(
      `${FLW_BASE}/payments`,
      {
        tx_ref:       txRef,
        amount,
        currency:     "NGN",
        redirect_url: `${base}/payment-success?type=subscription`,
        customer: {
          email:       req.user.email,
          name:        req.user.name || req.user.email,
          phonenumber: req.user.phone || "",
        },
        meta: { subscriptionPlan: plan, subscriptionType: type, userId: req.user._id.toString() },
        customizations: {
          title:       "UMP — Subscription",
          description: `${type === "seller" ? "Seller" : "Provider"} ${plan} subscription`,
          logo:        `${base}/images/ump-apple-touch-icon.png`,
        },
      },
      { headers: flwHeaders() }
    );

    const paymentLink = response.data?.data?.link;
    if (!paymentLink)
      return res.status(502).json({ success: false, message: "Payment provider unavailable — please try again" });

    await Payment.create({
      user:      req.user._id,
      orders:    [],
      provider:  "Flutterwave",
      amount,
      reference: txRef,
      status:    "pending",
      metadata:  { subscriptionPlan: plan, subscriptionType: type },
    });

    return res.json({
      success:      true,
      payment_link: paymentLink,
      reference:    txRef,
    });
  } catch (err) {
    logger.error("Subscription init error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to initialize payment. Please try again." });
  }
};

// ─── Verify subscription payment (called by frontend after Flutterwave redirect) ─
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id) return res.status(400).json({ success: false, message: "transaction_id required" });

    const flwRes = await axios.get(
      `${FLW_BASE}/transactions/${transaction_id}/verify`,
      { headers: flwHeaders() }
    );
    const data = flwRes.data?.data;
    if (!data) return res.status(400).json({ success: false, message: "Invalid Flutterwave response" });

    const payment = await Payment.findOneAndUpdate(
      { reference: data.tx_ref, status: "pending" },
      { $set: { status: "processing" } },
      { new: false }
    );

    if (!payment) {
      const existing = await Payment.findOne({ reference: data.tx_ref });
      if (!existing) return res.status(404).json({ success: false, message: "Payment not found" });
      return res.json({
        success: true,
        status:  existing.status,
        plan:    existing.metadata?.subscriptionPlan,
        type:    existing.metadata?.subscriptionType,
      });
    }

    const amountOk  = Math.abs(data.amount - payment.amount) <= 1;
    const finalStatus = data.status === "successful" && amountOk ? "success" : "failed";

    await Payment.findOneAndUpdate(
      { reference: data.tx_ref },
      { $set: { status: finalStatus, paidAt: finalStatus === "success" ? new Date() : null } }
    );

    if (finalStatus === "success") {
      await activateSubscription(payment);
      audit("SUBSCRIPTION_ACTIVATED", {
        actor:    req.user?._id,
        entity:   "Payment",
        entityId: payment._id,
        amount:   payment.amount,
        meta:     { reference: data.tx_ref, plan: payment.metadata?.subscriptionPlan, type: payment.metadata?.subscriptionType, transaction_id },
        req,
      });
    }

    return res.json({
      success: finalStatus === "success",
      status:  finalStatus,
      plan:    payment.metadata?.subscriptionPlan,
      type:    payment.metadata?.subscriptionType,
    });
  } catch (err) {
    logger.error("Subscription verify error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Verification failed. Please contact support." });
  }
};

// ----------------------------
// 1️⃣ Initialize Payment (Card or Transfer)
// ----------------------------
export const initializePayment = async (req, res) => {
  try {
    const { orderId, orderIds, provider, method } = req.body;

    // Accept either a single orderId (legacy) or an orderIds array (multi-seller)
    const rawIds = orderIds || (orderId ? [orderId] : []);
    if (!rawIds.length)
      return res.status(400).json({ success: false, message: "orderIds required" });

    const orders = await Order.find({ _id: { $in: rawIds }, buyer: req.user._id });
    if (!orders.length)
      return res.status(404).json({ success: false, message: "Orders not found" });

    if (provider !== "Paystack") {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported provider" });
    }

    const totalAmount = orders.reduce((s, o) => s + o.totalAmount, 0);
    const amountKobo = Math.round(totalAmount * 100);
    const reference = `UMP_${Date.now()}`;

    let authorization_url = null;
    let virtualAccount = null;

    // ----------------------------
    // Card Payment
    // ----------------------------
    if (method === "card") {
      const response = await paystack.post("/transaction/initialize", {
        email: req.user.email,
        amount: amountKobo,
        reference,
        callback_url: `${process.env.NODE_ENV === "production" ? (process.env.CLIENT_URL || "https://myump.com.ng") : "http://localhost:5173"}/payment-success`,
        metadata: { orderIds: orders.map((o) => o._id.toString()) },
      });

      authorization_url = response.data.data.authorization_url;
    }

    // ----------------------------
    // Bank Transfer via Virtual Account
    // ----------------------------
    else if (method === "transfer") {
      const response = await paystack.post("/dedicated_account", {
        customer: req.user.email,
        preferred_bank: "wema-bank", // choose your preferred bank
        metadata: { orderId },
      });

      const accountData = response.data.data;
      virtualAccount = {
        account_number: accountData.account_number,
        bank: accountData.bank,
        account_name: accountData.account_name,
      };
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }

    // Save payment record
    await Payment.create({
      orders: orders.map((o) => o._id),
      user: req.user._id,
      provider,
      amount: totalAmount,
      reference,
      status: "pending",
      method,
      virtualAccount,
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      authorization_url,
      reference,
      virtualAccount,
    });
  } catch (err) {
    logger.error(
      "💥 Payment initialization error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
    });
  }
};

// ----------------------------
// 2️⃣ Verify Card Payment
// ----------------------------
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference)
      return res
        .status(400)
        .json({ success: false, message: "Reference missing" });

    const response = await paystack.get(`/transaction/verify/${reference}`);
    const data = response.data.data;

    // Atomically claim this payment — prevents race with the webhook
    const payment = await Payment.findOneAndUpdate(
      { reference, status: "pending" },
      { $set: { status: "processing" } },
      { new: false }
    );

    if (!payment) {
      // Already processing or already finalised — idempotent response
      const existing = await Payment.findOne({ reference });
      if (!existing)
        return res.status(404).json({ success: false, message: "Payment not found" });
      return res.json({ success: true, message: "Payment already processed", status: existing.status, orderId: existing.orders?.[0] });
    }

    // Validate that the amount paid matches the expected order amount
    const expectedKobo = Math.round(payment.amount * 100);
    if (data.status === "success" && data.amount !== expectedKobo) {
      await Payment.findOneAndUpdate({ reference }, { $set: { status: "failed" } });
      await audit("PAYMENT_AMOUNT_MISMATCH", {
        actor: req.user?._id,
        entity: "Payment",
        entityId: payment._id,
        amount: data.amount / 100,
        meta: { expected: payment.amount, received: data.amount / 100, reference: payment.reference },
        req,
        status: "fail",
      });
      return res.status(400).json({ success: false, message: "Payment amount mismatch. Contact support." });
    }

    const finalStatus = data.status === "success" ? "success" : "failed";
    await Payment.findOneAndUpdate(
      { reference },
      { $set: { status: finalStatus, paidAt: data.status === "success" ? new Date() : null, metadata: data } }
    );
    payment.status = finalStatus;

    let orderSummaries = [];
    if (data.status === "success") {
      await confirmAllOrders(payment);
      audit("PAYMENT_VERIFIED", {
        actor: req.user?._id,
        entity: "Payment",
        entityId: payment._id,
        amount: payment.amount,
        meta: { reference: payment.reference, provider: "Paystack" },
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
    logger.error(
      "💥 Payment verification error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

// ----------------------------
// 3️⃣ Get supported banks
// ----------------------------
export const getBanks = async (req, res) => {
  try {
    const response = await paystack.get("/bank?country=nigeria&perPage=100");
    const banks = (response.data?.data || []).map((b) => ({
      name: b.name,
      code: b.code,
    }));
    return res.json({ success: true, banks });
  } catch (err) {
    logger.error("getBanks error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch banks" });
  }
};

// ----------------------------
// 4️⃣ Verify bank account number
// ----------------------------
export const verifyAccount = async (req, res) => {
  try {
    const { account_number, bank_code } = req.query;
    if (!account_number || !bank_code)
      return res.status(400).json({ success: false, message: "account_number and bank_code are required" });

    const response = await paystack.get(
      `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`
    );
    const data = response.data?.data;
    return res.json({ success: true, account_name: data.account_name });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.response?.data?.message || "Could not verify account",
    });
  }
};

// ----------------------------
// 5️⃣ Save seller bank details (stored directly — no Paystack registration required)
// ----------------------------
export const saveBankDetails = async (req, res) => {
  try {
    const { bankName, bankCode, accountName, accountNumber } = req.body;
    if (!bankCode || !accountNumber || !accountName)
      return res.status(400).json({ success: false, message: "bankCode, accountName, and accountNumber are required" });

    const seller = await Seller.findOneAndUpdate(
      { user: req.user._id },
      {
        bankDetails: {
          bankName,
          bankCode,
          accountName,
          accountNumber: encrypt(accountNumber),
        },
      },
      { new: true }
    );

    if (!seller) return res.status(404).json({ success: false, message: "Seller profile not found" });

    audit("BANK_DETAILS_UPDATED", {
      actor: req.user._id,
      entity: "Seller",
      entityId: seller._id,
      meta: { bankName, accountNumber: mask(accountNumber), accountName },
      req,
    });

    return res.json({ success: true, message: "Bank details saved successfully." });
  } catch (err) {
    logger.error("saveBankDetails error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to save bank details" });
  }
};

// ----------------------------
// 6️⃣ Paystack Webhook
// ----------------------------
export const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // --------------- Card or Virtual Account Payment ---------------
    if (event.event === "charge.success") {
      const data = event.data;

      // Atomically claim — prevents double-processing with verifyPayment
      const payment = await Payment.findOneAndUpdate(
        { reference: data.reference, status: "pending" },
        { $set: { status: "processing" } },
        { new: false }
      );

      if (payment && data.amount === Math.round(payment.amount * 100)) {
        await Payment.findOneAndUpdate(
          { reference: data.reference },
          { $set: { status: "success", paidAt: new Date(), metadata: data } }
        );
        // Route to the correct post-payment handler based on payment type
        if (payment.metadata?.subscriptionPlan) {
          await activateSubscription(payment);
          audit("WEBHOOK_SUBSCRIPTION_ACTIVATED", {
            entity: "Payment", entityId: payment._id,
            amount: data.amount / 100,
            meta: { reference: data.reference, plan: payment.metadata.subscriptionPlan, type: payment.metadata.subscriptionType },
            req,
          });
        } else if (payment.metadata?.type === "ad") {
          await activateAdCampaign(payment);
          audit("WEBHOOK_AD_ACTIVATED", {
            entity: "Payment", entityId: payment._id,
            amount: data.amount / 100,
            meta: { reference: data.reference, plan: payment.metadata.adPlan, productId: payment.metadata.productId },
            req,
          });
        } else {
          await confirmAllOrders(payment);
        }
        audit("WEBHOOK_PAYMENT_CONFIRMED", {
          entity: "Payment",
          entityId: payment._id,
          amount: data.amount / 100,
          meta: { reference: data.reference, provider: "Paystack" },
          req,
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error("💥 Webhook error:", err);
    res.sendStatus(500);
  }
};

