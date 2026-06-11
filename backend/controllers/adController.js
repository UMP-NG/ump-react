import mongoose from "mongoose";
import AdCampaign, { AD_PLANS } from "../models/AdCampaign.js";
import Config from "../models/Config.js";
import Product from "../models/Product.js";
import Payment from "../models/Payment.js";
import paystack from "../utils/paystack.js";
import { notify } from "../utils/notify.js";
import { audit } from "../utils/auditLog.js";
import logger from "../utils/logger.js";

async function buildAdPlans() {
  const config = await Config.findOne().select("adPlans").lean();
  return Object.entries(AD_PLANS).map(([key, def]) => ({
    key,
    label: config?.adPlans?.[key]?.label || def.label,
    days:  def.days,
    price: config?.adPlans?.[key]?.price ?? def.price,
  }));
}

async function getAdPrice(plan) {
  const config = await Config.findOne().select("adPlans").lean();
  return config?.adPlans?.[plan]?.price ?? AD_PLANS[plan]?.price;
}

// ── Shared activation logic (called by verifyAdPayment + webhook) ─────────────
export async function activateAdCampaign(payment) {
  const { adPlan, productId, campaignId } = payment.metadata || {};
  if (!adPlan || !productId) return;

  const planDef = AD_PLANS[adPlan];
  if (!planDef) return;

  const now = new Date();
  const endsAt = new Date(now.getTime() + planDef.days * 24 * 60 * 60 * 1000);

  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: campaignId, status: "pending_payment" },
    { $set: { status: "active", startedAt: now, endsAt, paymentRef: payment.reference } },
    { new: true }
  );
  if (!campaign) return; // already activated (idempotent)

  await Product.findByIdAndUpdate(productId, { isAdvertised: true, adEndsAt: endsAt });

  notify(payment.user, {
    type: "account",
    title: "Your ad is now live!",
    message: `Your ${planDef.label} (${planDef.days}-day) campaign started. It runs until ${endsAt.toLocaleDateString("en-NG")}.`,
    link: "/seller-dashboard",
  }).catch(() => {});

  logger.info(`AdCampaign ${campaign._id} activated for product ${productId} until ${endsAt}`);
}

// GET /api/ads/plans — returns current plan prices (reads from Config with fallback)
export const getAdPlans = async (req, res) => {
  try {
    const plans = await buildAdPlans();
    res.json({ plans });
  } catch (err) {
    logger.error("getAdPlans:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/ads/initiate — seller picks product + plan, gets Paystack URL
export const initiateAdPayment = async (req, res) => {
  try {
    const { productId, plan } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: "Invalid product ID" });
    if (!AD_PLANS[plan])
      return res.status(400).json({ message: "Invalid plan. Choose 3days, 7days, or 14days" });

    const product = await Product.findOne({ _id: productId, seller: req.user._id }).select("name isAdvertised");
    if (!product) return res.status(404).json({ message: "Product not found or does not belong to you" });

    // Allow re-promoting if current ad expired — block only if actively running
    const active = await AdCampaign.findOne({ product: productId, status: "active" });
    if (active) return res.status(409).json({ message: "This product already has an active ad campaign" });

    const planDef = AD_PLANS[plan];
    const planPrice = await getAdPrice(plan);
    const reference = `UMP_AD_${Date.now()}_${req.user._id.toString().slice(-6)}`;
    const clientUrl = process.env.NODE_ENV === "production"
      ? (process.env.CLIENT_URL || "https://myump.com.ng")
      : "http://localhost:5173";

    // Create the campaign record upfront so we have an ID to pass through
    const campaign = await AdCampaign.create({
      product: productId,
      seller:  req.user._id,
      plan,
      amount:  planPrice,
    });

    const paystackRes = await paystack.post("/transaction/initialize", {
      email:        req.user.email,
      amount:       planPrice * 100,
      reference,
      callback_url: `${clientUrl}/payment-success?type=ad`,
      metadata: {
        adPlan:     plan,
        productId:  productId.toString(),
        campaignId: campaign._id.toString(),
        userId:     req.user._id.toString(),
      },
    });

    await Payment.create({
      user:      req.user._id,
      orders:    [],
      provider:  "Paystack",
      amount:    planPrice,
      reference,
      status:    "pending",
      metadata:  { adPlan: plan, productId: productId.toString(), campaignId: campaign._id.toString(), type: "ad" },
    });

    return res.json({
      success:           true,
      authorization_url: paystackRes.data.data.authorization_url,
      reference,
      campaign:          { _id: campaign._id, plan, amount: planPrice, label: planDef.label, days: planDef.days },
    });
  } catch (err) {
    logger.error("initiateAdPayment:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to initialize ad payment" });
  }
};

// GET /api/ads/verify?reference= — called by frontend after Paystack redirect
export const verifyAdPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ message: "Reference required" });

    const psRes = await paystack.get(`/transaction/verify/${reference}`);
    const data  = psRes.data.data;

    const payment = await Payment.findOneAndUpdate(
      { reference, status: "pending" },
      { $set: { status: "processing" } },
      { new: false }
    );

    if (!payment) {
      const existing = await Payment.findOne({ reference });
      if (!existing) return res.status(404).json({ message: "Payment not found" });
      const camp = await AdCampaign.findOne({ paymentRef: reference }).populate("product", "name").lean();
      return res.json({ success: true, status: existing.status, plan: existing.metadata?.adPlan, campaign: camp });
    }

    const amountMatch = data.amount === Math.round(payment.amount * 100);
    const finalStatus = data.status === "success" && amountMatch ? "success" : "failed";

    await Payment.findOneAndUpdate(
      { reference },
      { $set: { status: finalStatus, paidAt: finalStatus === "success" ? new Date() : null } }
    );

    if (finalStatus === "success") {
      await activateAdCampaign(payment);
      audit("AD_PAYMENT_VERIFIED", {
        actor:    req.user?._id,
        entity:   "Payment",
        entityId: payment._id,
        amount:   payment.amount,
        meta:     { reference, plan: payment.metadata?.adPlan, productId: payment.metadata?.productId },
        req,
      });
    } else {
      // Revert the campaign to cancelled so seller can try again
      await AdCampaign.findByIdAndUpdate(payment.metadata?.campaignId, { status: "cancelled" });
    }

    const camp = await AdCampaign.findOne({ _id: payment.metadata?.campaignId }).populate("product", "name").lean();
    return res.json({ success: finalStatus === "success", status: finalStatus, plan: payment.metadata?.adPlan, campaign: camp });
  } catch (err) {
    logger.error("verifyAdPayment:", err.response?.data || err.message);
    return res.status(500).json({ message: "Verification failed. Please contact support." });
  }
};

// GET /api/ads/my — seller's own campaigns
export const getMyAdCampaigns = async (req, res) => {
  try {
    const campaigns = await AdCampaign.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate("product", "name images price isAdvertised")
      .lean();
    res.json({ campaigns });
  } catch (err) {
    logger.error("getMyAdCampaigns:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/ads — admin: all campaigns
export const getAllAdCampaigns = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const filter = status ? { status } : {};
    const [campaigns, total] = await Promise.all([
      AdCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("product", "name images price isAdvertised")
        .populate("seller", "name email")
        .lean(),
      AdCampaign.countDocuments(filter),
    ]);
    res.json({ campaigns, total, page: Number(page) });
  } catch (err) {
    logger.error("getAllAdCampaigns:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/ads/:id/cancel — admin cancel or seller cancel pending_payment
export const cancelAdCampaign = async (req, res) => {
  try {
    const isAdmin = req.user.roles?.includes("admin");
    const filter  = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, seller: req.user._id, status: "pending_payment" };

    const campaign = await AdCampaign.findOneAndUpdate(
      filter,
      { $set: { status: "cancelled" } },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ message: "Campaign not found or cannot be cancelled" });

    // If was active, turn off the product flag
    if (campaign.status === "cancelled") {
      await Product.findByIdAndUpdate(campaign.product, { isAdvertised: false, adEndsAt: null });
    }

    res.json({ success: true, campaign });
  } catch (err) {
    logger.error("cancelAdCampaign:", err);
    res.status(500).json({ message: "Server error" });
  }
};
