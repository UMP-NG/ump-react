import Payout from "../models/Payout.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Config from "../models/Config.js";
import logger from "../utils/logger.js";
import { decrypt, mask } from "../utils/fieldEncryption.js";
import { notify } from "../utils/notify.js";

// Fix #10a: read bank details from Seller model where they are actually stored
export const getPayoutDetails = async (req, res) => {
  try {
    const seller = await Seller.findOne({ user: req.user._id }).select("bankDetails").lean();
    const accountDetails = seller?.bankDetails || {};
    res.json({
      success: true,
      accountDetails: {
        bankName:      accountDetails.bankName      || "",
        bankCode:      accountDetails.bankCode      || "",
        accountName:   accountDetails.accountName   || "",
        accountNumber: mask(accountDetails.accountNumber || ""),
      },
    });
  } catch (err) {
    logger.error("Payout fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Fix #10b: updatePayoutDetails was writing to non-existent User fields.
// The canonical bank-details save is in paymentController.saveBankDetails (registers Paystack recipient).
// This endpoint now redirects callers to use that instead.
export const updatePayoutDetails = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Use PUT /api/payments/bank-details to update bank details — it registers the account with Paystack for instant transfers.",
  });
};

export const requestPayout = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0)
      return res.status(400).json({ message: "No payout data received" });

    const userId = req.user._id;
    const roles = req.user.roles || [];
    const { amount, method, accountDetails } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    const config = await Config.findOne().select("fees").lean();
    const minPayout = config?.fees?.minPayout ?? 2000;
    if (amount < minPayout)
      return res.status(400).json({ message: `Minimum payout is ₦${minPayout.toLocaleString("en-NG")}` });

    const payoutData = {
      amount,
      method,
      accountDetails,
      status: "pending",
    };

    if (roles.includes("seller")) {
      payoutData.seller = userId;

      const seller = await Seller.findOne({ user: userId });
      if (!seller) return res.status(404).json({ message: "Seller profile not found" });
      if ((seller.pendingPayout || 0) < amount)
        return res.status(400).json({ message: "Insufficient wallet balance" });

      // Deduct from wallet immediately
      await Seller.findOneAndUpdate(
        { user: userId },
        { $inc: { pendingPayout: -amount } }
      );

      // Payout is always saved as "pending" — admin reviews and processes manually
    } else if (roles.includes("service_provider")) {
      // Atomic check-and-deduct — prevents race condition double-spend
      const updated = await User.findOneAndUpdate(
        { _id: userId, earningsBalance: { $gte: amount } },
        { $inc: { earningsBalance: -amount } },
        { new: false }
      );
      if (!updated) return res.status(400).json({ message: "Insufficient earnings balance" });
      payoutData.provider = userId;
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const payout = await Payout.create(payoutData);

    // Notify the seller
    notify(userId, {
      type: "payout",
      title: "Payout requested",
      message: `Your payout request of ₦${Number(amount).toLocaleString("en-NG")} has been submitted and is under review.`,
      link: "/seller-dashboard",
    }).catch(() => {});

    res.json({ success: true, message: "Payout request submitted — our team will review and process it within 1–2 business days.", payout });

    // Fire-and-forget: push notification to all admins
    const requesterName = req.user.name || req.user.email || "A seller";
    User.find({ roles: "admin" }, { _id: 1 }).lean()
      .then((admins) =>
        Promise.all(admins.map((a) =>
          notify(a._id, {
            type:    "payout",
            title:   "Payout request",
            message: `${requesterName} requested a payout of ₦${Number(amount).toLocaleString("en-NG")}.`,
            link:    "/admin/payouts",
          })
        ))
      )
      .catch((err) => logger.error("requestPayout notify admins:", err.message));
  } catch (err) {
    logger.error("requestPayout error:", err);
    res.status(500).json({ message: "Payout request failed. Please try again." });
  }
};

export const retryPayout = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    if (payout.seller?.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    // Payouts are processed manually by admin — nothing to retry on the seller's side
    res.json({ success: true, message: "Your payout request is pending — our team will review and process it within 1–2 business days.", payout });
  } catch (err) {
    logger.error("retryPayout error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPayoutsForSeller = async (req, res) => {
  try {
    const userId = req.user._id;
    const payouts = await Payout.find({ seller: userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ payouts });
  } catch (err) {
    logger.error("getPayoutsForSeller error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Fix #14: use seller.pendingPayout (the canonical live balance maintained by
// updateOrderStatus + confirmDelivery) instead of re-aggregating Order/Payout docs,
// which could diverge from reality after cancellations or refunds.
export const getPayoutSummary = async (req, res) => {
  try {
    const userId = req.user?._id;
    const roles  = req.user.roles || [];

    // For sellers: read directly from the Seller document
    if (roles.includes("seller")) {
      const seller    = await Seller.findOne({ user: userId }).select("pendingPayout payoutHistory").lean();
      const lastEntry = seller?.payoutHistory?.slice(-1)?.[0];
      return res.json({
        success: true,
        summary: {
          available:     seller?.pendingPayout || 0,
          lastPayoutDate: lastEntry?.date      || null,
          role:          "seller",
        },
      });
    }

    // For other roles: fall back to aggregation with a timeout guard
    const role = roles.includes("walker")
      ? "walker"
      : roles.includes("service_provider")
      ? "provider"
      : null;

    if (!role) return res.status(403).json({ message: "Unauthorized role" });

    const roleKey = role;

    const computeSummary = async () => {
      const paidAgg = await Order.aggregate([
        { $match: { [roleKey]: userId, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]);
      const paidOutAgg = await Payout.aggregate([
        { $match: { [roleKey]: userId, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const lastPayout = await Payout.findOne({ [roleKey]: userId }).sort({ createdAt: -1 }).lean();
      return {
        available:     Math.max(0, (paidAgg[0]?.total || 0) - (paidOutAgg[0]?.total || 0)),
        lastPayoutDate: lastPayout?.createdAt || null,
        role,
      };
    };

    const result = await Promise.race([
      computeSummary(),
      new Promise(resolve => setTimeout(() => resolve({ available: 0, nextPayout: null, _timedOut: true }), 8000)),
    ]);

    if (result._timedOut) {
      logger.warn(`[payoutController] getPayoutSummary timed out for ${role}`);
      return res.json({ success: true, summary: { available: 0, nextPayout: null } });
    }
    return res.json({ success: true, summary: result });
  } catch (err) {
    logger.error("getPayoutSummary error:", err);
    res.status(500).json({ message: "Failed to load payout summary" });
  }
};

