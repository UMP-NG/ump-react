import mongoose from "mongoose";
import axios from "axios";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import CartPaymentRequest from "../models/CartPaymentRequest.js";
import Config from "../models/Config.js";
import { audit } from "../utils/auditLog.js";
import { confirmAllOrders } from "../utils/confirmOrders.js";
import { notify } from "../utils/notify.js";
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
      if (payment.metadata?.type === "cart_link" && payment.metadata?.cartPaymentToken) {
        await fulfillCartLinkPayment(payment.metadata.cartPaymentToken, payment.user);
      } else {
        await confirmAllOrders(payment);
      }
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
// Helper: Create orders from a CartPaymentRequest after payment succeeds
// ----------------------------
async function fulfillCartLinkPayment(token, ownerId) {
  try {
    const cartReq = await CartPaymentRequest.findOne({ token, paymentStatus: "pending" });
    if (!cartReq) return;

    // Group items by seller
    const sellerGroups = new Map();
    for (const item of cartReq.items) {
      const sid = item.sellerId?.toString();
      if (!sid) continue;
      if (!sellerGroups.has(sid)) sellerGroups.set(sid, []);
      sellerGroups.get(sid).push(item);
    }

    // Total subtotal across all items — used to prorate service charge per seller
    const totalSubtotal = cartReq.items.reduce((s, i) => s + i.price * i.quantity, 0) || 1;

    for (const [sid, sellerItems] of sellerGroups) {
      const orderItems = sellerItems.map((i) => ({
        product: i.productId,
        quantity: i.quantity,
        price: i.price,
      }));
      const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
      // Prorate the cart-level service charge by this seller's share of the subtotal
      const serviceCharge = Math.round((subtotal / totalSubtotal) * (cartReq.serviceCharge || 0));
      const order = await Order.create({
        buyer: ownerId,
        seller: new mongoose.Types.ObjectId(sid),
        items: orderItems,
        subtotal,
        serviceCharge,
        deliveryFee: 0,
        totalAmount: subtotal + serviceCharge,
        paymentStatus: "paid",
        status: "confirmed",
        paymentMethod: "Flutterwave",
        shippingAddress: cartReq.shippingAddress || {},
      });
      if (order.seller) {
        notify(order.seller, {
          type: "order",
          title: "New order received",
          message: `Payment confirmed — ₦${order.totalAmount.toLocaleString()}. Ready to fulfil.`,
          link: "/seller-dashboard",
        });
        await Seller.findOneAndUpdate({ user: order.seller }, { $inc: { totalOrders: 1 } });
      }
    }

    notify(ownerId, {
      type: "order",
      title: "Your cart has been paid!",
      message: "Someone paid for your cart. Your orders are now being processed.",
      link: "/orders",
    });

    cartReq.paymentStatus = "paid";
    await cartReq.save();
  } catch (err) {
    logger.error("💥 fulfillCartLinkPayment error:", err.message);
  }
}

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
        // Cart link payment — create orders from the snapshot then notify
        if (payment.metadata?.type === "cart_link" && payment.metadata?.cartPaymentToken) {
          await fulfillCartLinkPayment(payment.metadata.cartPaymentToken, payment.user);
        } else {
          await confirmAllOrders(payment);
        }
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

// ----------------------------
// 4️⃣ Create Cart Payment Link (owner generates shareable link for someone else to pay)
// ----------------------------
async function getFeeConfig() {
  const config = await Config.findOne().select("fees").lean();
  const f = config?.fees || {};
  return {
    serviceChargeEnabled: f.serviceChargeEnabled ?? true,
    serviceFeeRate: (f.serviceFee ?? 5.0) / 100,
    serviceChargeMax: f.serviceChargeMax ?? 2000,
  };
}

export const createCartPaymentLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ success: false, message: "Your cart is empty." });

    const cfg = await getFeeConfig();

    // Build snapshot + calculate totals per-item capped
    let subtotal = 0;
    let serviceCharge = 0;
    const items = [];
    for (const i of cart.items) {
      const p = i.product;
      if (!p?._id) continue;
      const unitPrice = i.negotiatedPrice ?? p.price ?? 0;
      const qty = i.quantity || 1;
      const lineTotal = unitPrice * qty;
      const lineSvc = cfg.serviceChargeEnabled
        ? Math.min(cfg.serviceChargeMax, Math.round(lineTotal * cfg.serviceFeeRate))
        : 0;
      subtotal += lineTotal;
      serviceCharge += lineSvc;
      items.push({
        productId: p._id,
        sellerId: p.seller,
        name: p.name || "Product",
        price: unitPrice,
        quantity: qty,
        image: p.images?.[0]?.url || "",
      });
    }
    if (!items.length)
      return res.status(400).json({ success: false, message: "No valid items in cart." });

    const total = subtotal + serviceCharge;
    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 h

    await CartPaymentRequest.create({
      token,
      owner: userId,
      ownerName: req.user.name || "",
      ownerEmail: req.user.email || "",
      items,
      subtotal,
      serviceCharge,
      total,
      expiresAt,
    });

    const base = clientUrl();
    return res.json({ success: true, link: `${base}/pay/${token}`, expiresAt });
  } catch (err) {
    logger.error("💥 createCartPaymentLink error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate payment link." });
  }
};

// ----------------------------
// 5️⃣ Get Cart Payment Link Details (public — no auth)
// ----------------------------
export const getCartPaymentDetails = async (req, res) => {
  try {
    const { token } = req.params;
    const req2 = await CartPaymentRequest.findOne({ token }).lean();
    if (!req2 || req2.paymentStatus === "paid")
      return res.status(404).json({ success: false, message: req2 ? "This link has already been paid." : "Payment link not found." });
    if (new Date() > new Date(req2.expiresAt))
      return res.status(410).json({ success: false, message: "This payment link has expired." });
    return res.json({
      success: true,
      ownerName: req2.ownerName,
      items: req2.items,
      subtotal: req2.subtotal,
      serviceCharge: req2.serviceCharge,
      total: req2.total,
      expiresAt: req2.expiresAt,
    });
  } catch (err) {
    logger.error("💥 getCartPaymentDetails error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ----------------------------
// 6️⃣ Pay a Cart Payment Link (payer initializes Flutterwave)
// ----------------------------
export const payCartLink = async (req, res) => {
  try {
    const { token } = req.params;
    const { payerName, payerEmail, payerPhone } = req.body;
    if (!payerEmail) return res.status(400).json({ success: false, message: "Payer email is required." });

    const cartReq = await CartPaymentRequest.findOne({ token, paymentStatus: "pending" }).lean();
    if (!cartReq)
      return res.status(404).json({ success: false, message: "Payment link not found or already paid." });
    if (new Date() > new Date(cartReq.expiresAt))
      return res.status(410).json({ success: false, message: "This payment link has expired." });

    const reference = `UMP_CARTLINK_${Date.now()}_${token.slice(0, 8)}`;
    const base = clientUrl();

    const response = await axios.post(
      `${FLW_BASE}/payments`,
      {
        tx_ref: reference,
        amount: cartReq.total,
        currency: "NGN",
        redirect_url: `${base}/pay/${token}/success`,
        customer: {
          email: payerEmail,
          name: payerName || payerEmail,
          phonenumber: payerPhone || "",
        },
        meta: { cartPaymentToken: token, ownerId: cartReq.owner.toString() },
        customizations: {
          title: "UMP — Pay for someone",
          description: `Paying ${cartReq.ownerName}'s cart`,
          logo: `${base}/images/ump-apple-touch-icon.png`,
        },
      },
      { headers: flwHeaders() }
    );

    const paymentLink = response.data?.data?.link;
    if (!paymentLink) throw new Error("No payment link from Flutterwave");

    // Record the payment intent
    await Payment.create({
      user: cartReq.owner,
      orders: [],
      provider: "Flutterwave",
      amount: cartReq.total,
      reference,
      status: "pending",
      metadata: { cartPaymentToken: token, type: "cart_link" },
    });

    // Store the reference on the request so webhook can find it
    await CartPaymentRequest.findOneAndUpdate({ token }, { flwTxRef: reference });

    return res.json({ success: true, payment_link: paymentLink, reference });
  } catch (err) {
    logger.error("💥 payCartLink error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to initialize payment." });
  }
};
