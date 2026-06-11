import Payout from "../models/Payout.js";
import Seller from "../models/Seller.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";
import { fmt, startOf } from "./adminHelpers.js";
import { decrypt } from "../utils/fieldEncryption.js";

const PAYOUT_FEE_RATE = 0.032; // 3.2% platform fee deducted from gross payout
const RISK_HIGH_THRESHOLD   = 500_000;
const RISK_MEDIUM_THRESHOLD = 100_000;

export const getAdminPayouts = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const payouts = await Payout.find({ status }).sort({ createdAt: -1 })
      .populate("seller",   "name email")
      .populate("provider", "name email")
      .lean();
    const userIds  = payouts.map((p) => p.seller?._id || p.provider?._id).filter(Boolean);
    const sellers  = userIds.length ? await Seller.find({ user: { $in: userIds } }).select("user storeName bankDetails pendingPayout").lean() : [];
    const sellerMap = Object.fromEntries(sellers.map((s) => [s.user.toString(), s]));
    const shaped = payouts.map((p) => {
      const uid  = p.seller?._id?.toString() || p.provider?._id?.toString();
      const sDoc = uid ? sellerMap[uid] : null;
      // Merge property-by-property so a partial p.accountDetails doesn't block the
      // Seller.bankDetails fallback for individual missing fields.
      const pa = p.accountDetails || {};
      const bd = sDoc?.bankDetails  || {};
      const acct = {
        bankName:      pa.bankName      || bd.bankName      || "",
        accountName:   pa.accountName   || bd.accountName   || "",
        accountNumber: pa.accountNumber || bd.accountNumber || "",
      };
      return {
        _id: p._id,
        seller: { storeName: sDoc?.storeName || p.seller?.name || p.provider?.name || "—", ownerName: p.seller?.name || p.provider?.name || "—" },
        bankName:      acct.bankName    || "—",
        accountName:   acct.accountName || "—",
        accountNumber: (() => {
          try { return decrypt(acct.accountNumber || "") || "—"; }
          catch { return "—"; }
        })(),
        availableBalance: sDoc?.pendingPayout || 0, requestedAmount: p.amount,
        netAmount: Math.floor(p.amount * (1 - PAYOUT_FEE_RATE)),
        status: p.status,
        riskLevel: p.amount > RISK_HIGH_THRESHOLD ? "High" : p.amount > RISK_MEDIUM_THRESHOLD ? "Medium" : "Low",
        createdAt: p.createdAt,
      };
    });
    res.json({ payouts: shaped });
  } catch (err) {
    logger.error("getAdminPayouts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPayoutsSummary = async (req, res) => {
  try {
    const today      = startOf(0);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [pending, approvedToday, paidMonth] = await Promise.all([
      Payout.aggregate([{ $match: { status: "pending" } },                                                                      { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payout.aggregate([{ $match: { status: { $in: ["processing","completed"] }, updatedAt: { $gte: today } } },                 { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payout.aggregate([{ $match: { status: "completed", updatedAt: { $gte: monthStart } } },                                   { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    res.json({
      pendingValue:  fmt(pending[0]?.total      || 0),
      approvedToday: fmt(approvedToday[0]?.total || 0),
      paidThisMonth: fmt(paidMonth[0]?.total     || 0),
      walletFloat:   fmt(pending[0]?.total       || 0),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const approvePayout = async (req, res) => {
  try {
    const payout = await Payout.findOneAndUpdate(
      { _id: req.params.payoutId, status: "pending" },
      { $set: { status: "processing" } },
      { new: true }
    );
    if (!payout) return res.status(400).json({ message: "Payout not found or already processed" });
    if (payout.seller) {
      // Aggregation pipeline update prevents pendingPayout from going below 0
      await Seller.findOneAndUpdate(
        { user: payout.seller },
        [{ $set: { pendingPayout: { $max: [0, { $subtract: ["$pendingPayout", payout.amount] }] } } }]
      );
      notify(payout.seller, { type: "payout", title: "Payout processing", message: `Your payout of ${fmt(payout.amount)} is now being processed and will be sent to your bank account shortly.`, link: "/seller-dashboard" });
    }
    res.json({ success: true, payout });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
