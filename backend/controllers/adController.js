import mongoose from "mongoose";
import axios from "axios";
import AdCampaign, { AD_PLANS } from "../models/AdCampaign.js";
import Config from "../models/Config.js";
import Product from "../models/Product.js";
import Payment from "../models/Payment.js";
import { notify } from "../utils/notify.js";
import { audit } from "../utils/auditLog.js";
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

// POST /api/ads/initiate — seller picks product + plan, gets Flutterwave URL
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
    const txRef = `UMP_AD_${Date.now()}_${req.user._id.toString().slice(-6)}`;
    const base = clientUrl();

    // Create campaign first so we have its ID for metadata
    const campaign = await AdCampaign.create({
      product: productId,
      seller:  req.user._id,
      plan,
      amount:  planPrice,
    });

    let flwRes;
    try {
      flwRes = await axios.post(
        `${FLW_BASE}/payments`,
        {
          tx_ref:       txRef,
          amount:       planPrice,
          currency:     "NGN",
          redirect_url: `${base}/payment-success?type=ad`,
          customer: {
            email:       req.user.email,
            name:        req.user.name || req.user.email,
            phonenumber: req.user.phone || "",
          },
          meta: {
            adPlan:    plan,
            productId: productId.toString(),
            campaignId: campaign._id.toString(),
            type:      "ad",
          },
          customizations: {
            title:       "UMP — Advertise your product",
            description: `${planDef.label} ad campaign`,
            logo:        `${base}/images/ump-apple-touch-icon.png`,
          },
        },
        { headers: flwHeaders() }
      );
    } catch (flwErr) {
      // Roll back the campaign record if Flutterwave fails
      await AdCampaign.findByIdAndDelete(campaign._id);
      logger.error("initiateAdPayment Flutterwave init:", flwErr.response?.data || flwErr.message);
      return res.status(502).json({ message: "Payment provider unavailable — please try again" });
    }

    const paymentLink = flwRes.data?.data?.link;
    if (!paymentLink) {
      await AdCampaign.findByIdAndDelete(campaign._id);
      return res.status(502).json({ message: "No payment link returned from Flutterwave" });
    }

    await Payment.create({
      user:      req.user._id,
      orders:    [],
      provider:  "Flutterwave",
      amount:    planPrice,
      reference: txRef,
      status:    "pending",
      metadata:  { adPlan: plan, productId: productId.toString(), campaignId: campaign._id.toString(), type: "ad" },
    });

    return res.json({
      success:      true,
      payment_link: paymentLink,
      reference:    txRef,
      campaign:     { _id: campaign._id, plan, amount: planPrice, label: planDef.label, days: planDef.days },
    });
  } catch (err) {
    logger.error("initiateAdPayment:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to initialize ad payment" });
  }
};

// GET /api/ads/verify?transaction_id= — called by frontend after Flutterwave redirect
export const verifyAdPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id) return res.status(400).json({ message: "transaction_id required" });

    const flwRes = await axios.get(
      `${FLW_BASE}/transactions/${transaction_id}/verify`,
      { headers: flwHeaders() }
    );
    const data = flwRes.data?.data;
    if (!data) return res.status(400).json({ message: "Invalid Flutterwave response" });

    // Flutterwave returns the original tx_ref so we can look up the Payment record
    const payment = await Payment.findOneAndUpdate(
      { reference: data.tx_ref, status: "pending" },
      { $set: { status: "processing" } },
      { new: false }
    );

    if (!payment) {
      const existing = await Payment.findOne({ reference: data.tx_ref });
      if (!existing) return res.status(404).json({ message: "Payment not found" });
      const camp = await AdCampaign.findOne({ _id: existing.metadata?.campaignId }).populate("product", "name").lean();
      return res.json({ success: true, status: existing.status, plan: existing.metadata?.adPlan, campaign: camp });
    }

    // FLW returns amount in naira; payment.amount is also in naira
    const amountOk = Math.abs(data.amount - payment.amount) <= 1;
    const finalStatus = data.status === "successful" && amountOk ? "success" : "failed";

    await Payment.findOneAndUpdate(
      { reference: data.tx_ref },
      { $set: { status: finalStatus, paidAt: finalStatus === "success" ? new Date() : null, metadata: { ...payment.metadata, flw: data } } }
    );

    if (finalStatus === "success") {
      await activateAdCampaign(payment);
      audit("AD_PAYMENT_VERIFIED", {
        actor:    req.user?._id,
        entity:   "Payment",
        entityId: payment._id,
        amount:   payment.amount,
        meta:     { reference: data.tx_ref, plan: payment.metadata?.adPlan, productId: payment.metadata?.productId, transaction_id },
        req,
      });
    } else {
      await AdCampaign.findByIdAndUpdate(payment.metadata?.campaignId, { status: "cancelled" });
      // Notify seller their ad payment failed
      if (payment.user) {
        notify(payment.user, {
          type:    "account",
          title:   "Ad payment failed",
          message: "Your ad campaign payment could not be verified. Please try again or contact support.",
          link:    "/seller-dashboard",
        }).catch(() => {});
      }
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
      : { _id: req.params.id, seller: req.user._id, status: { $in: ["pending_payment", "active"] } };

    const campaign = await AdCampaign.findOneAndUpdate(
      filter,
      { $set: { status: "cancelled" } },
      { new: false }  // get pre-update doc to check previous status
    );
    if (!campaign) return res.status(404).json({ message: "Campaign not found or cannot be cancelled" });

    // Only clear the product ad flag if the campaign was previously active
    if (campaign.status === "active") {
      await Product.findByIdAndUpdate(campaign.product, { isAdvertised: false, adEndsAt: null });
    }

    // Notify the seller only when an admin cancels their campaign (not when seller self-cancels)
    if (isAdmin && campaign.seller && campaign.seller.toString() !== req.user._id.toString()) {
      notify(campaign.seller, {
        type:    "account",
        title:   "Ad campaign cancelled",
        message: `Your ad campaign has been cancelled by an admin. Contact support if you have questions.`,
        link:    "/seller-dashboard",
      }).catch(() => {});
    }

    res.json({ success: true, campaign });
  } catch (err) {
    logger.error("cancelAdCampaign:", err);
    res.status(500).json({ message: "Server error" });
  }
};
