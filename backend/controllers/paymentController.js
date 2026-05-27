// backend/controllers/payments.js
import paystack from "../utils/paystack.js";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import crypto from "crypto";
import { audit } from "../utils/auditLog.js";
import { notify } from "../utils/notify.js";

// ----------------------------
// 1️⃣ Initialize Payment (Card or Transfer)
// ----------------------------
export const initializePayment = async (req, res) => {
  try {
    const { orderId, provider, method } = req.body;

    // Validate order
    const order = await Order.findById(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (provider !== "Paystack") {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported provider" });
    }

    const amountKobo = Number(order.totalAmount) * 100; // Convert to kobo
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
        metadata: { orderId },
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
      order: orderId,
      user: req.user._id,
      provider,
      amount: order.totalAmount,
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
    console.error(
      "💥 Payment initialization error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
      error: err.response?.data || err.message,
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
      return res.json({ success: true, message: "Payment already processed", status: existing.status, orderId: existing.order });
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

    if (data.status === "success") {
      const confirmedOrder = await Order.findByIdAndUpdate(payment.order, {
        paymentStatus: "paid",
        status: "confirmed",
      }, { new: true });

      if (confirmedOrder) {
        const shortId = confirmedOrder._id.toString().slice(-6).toUpperCase();

        // Notify buyer — payment confirmed
        notify(confirmedOrder.buyer, {
          type: "order",
          title: "Payment confirmed!",
          message: `Your payment for order #${shortId} was successful. The seller has been notified.`,
          link: "/orders",
        });

        // Notify seller — now that money is in escrow
        if (confirmedOrder.seller) {
          notify(confirmedOrder.seller, {
            type: "order",
            title: "New order received",
            message: `Payment confirmed for order #${shortId} — ₦${confirmedOrder.totalAmount.toLocaleString()}. Ready to fulfil.`,
            link: "/seller-dashboard",
          });

          await Seller.findOneAndUpdate(
            { user: confirmedOrder.seller },
            { $inc: { totalOrders: 1 } }
          );
        }
      }

      audit("PAYMENT_VERIFIED", {
        actor: req.user?._id,
        entity: "Order",
        entityId: payment.order,
        amount: payment.amount,
        meta: { reference: payment.reference, provider: "Paystack" },
        req,
      });
    }

    return res.json({
      success: true,
      message: "Payment verified",
      status: payment.status,
      orderId: payment.order,
    });
  } catch (err) {
    console.error(
      "💥 Payment verification error:",
      err.response?.data || err.message
    );
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.response?.data || err.message,
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
    console.error("getBanks error:", err.response?.data || err.message);
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
// 5️⃣ Save seller bank details + register Paystack transfer recipient
// ----------------------------
export const saveBankDetails = async (req, res) => {
  try {
    const { bankName, bankCode, accountName, accountNumber } = req.body;
    if (!bankCode || !accountNumber || !accountName)
      return res.status(400).json({ success: false, message: "bankCode, accountName, and accountNumber are required" });

    // Register / update recipient on Paystack
    const recipientRes = await paystack.post("/transferrecipient", {
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    });
    const recipientCode = recipientRes.data?.data?.recipient_code;

    const seller = await Seller.findOneAndUpdate(
      { user: req.user._id },
      {
        bankDetails: {
          bankName,
          bankCode,
          accountName,
          accountNumber,
          paystackRecipientCode: recipientCode,
        },
      },
      { new: true }
    );

    if (!seller) return res.status(404).json({ success: false, message: "Seller profile not found" });

    audit("BANK_DETAILS_UPDATED", {
      actor: req.user._id,
      entity: "Seller",
      entityId: seller._id,
      meta: { bankName, accountNumber: accountNumber.slice(-4).padStart(accountNumber.length, "*"), accountName },
      req,
    });

    return res.json({ success: true, message: "Bank details saved", recipientCode });
  } catch (err) {
    console.error("saveBankDetails error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || "Failed to save bank details",
    });
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
      const orderId = data.metadata.orderId;

      // Atomically claim — prevents double-processing with verifyPayment
      const payment = await Payment.findOneAndUpdate(
        { order: orderId, reference: data.reference, status: "pending" },
        { $set: { status: "processing" } },
        { new: false }
      );

      if (payment && data.amount === payment.amount * 100) {
        await Payment.findOneAndUpdate(
          { reference: data.reference },
          { $set: { status: "success", paidAt: new Date(), metadata: data } }
        );

        const webhookOrder = await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "paid",
          status: "confirmed",
        }, { new: true });

        if (webhookOrder) {
          const shortId = webhookOrder._id.toString().slice(-6).toUpperCase();

          notify(webhookOrder.buyer, {
            type: "order",
            title: "Payment confirmed!",
            message: `Your payment for order #${shortId} was successful. The seller has been notified.`,
            link: "/orders",
          });

          if (webhookOrder.seller) {
            notify(webhookOrder.seller, {
              type: "order",
              title: "New order received",
              message: `Payment confirmed for order #${shortId} — ₦${webhookOrder.totalAmount.toLocaleString()}. Ready to fulfil.`,
              link: "/seller-dashboard",
            });

            await Seller.findOneAndUpdate(
              { user: webhookOrder.seller },
              { $inc: { totalOrders: 1 } }
            );
          }
        }

        audit("WEBHOOK_PAYMENT_CONFIRMED", {
          entity: "Order",
          entityId: orderId,
          amount: data.amount / 100,
          meta: { reference: data.reference, provider: "Paystack" },
          req,
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("💥 Webhook error:", err);
    res.sendStatus(500);
  }
};

