import Payout from "../models/Payout.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Config from "../models/Config.js";
import paystack from "../utils/paystack.js";

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
        accountNumber: accountDetails.accountNumber || "",
      },
    });
  } catch (err) {
    console.error("Payout fetch error:", err);
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

    // Fix #17: enforce the platform minimum payout from Config (default ₦2000)
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

      // Fire Paystack transfer if bank is registered
      if (seller.bankDetails?.paystackRecipientCode) {
        try {
          const transferRef = `PAYOUT_${userId}_${Date.now()}`;
          const transferRes = await paystack.post("/transfer", {
            source: "balance",
            reason: "UMP seller payout withdrawal",
            amount: amount * 100,
            recipient: seller.bankDetails.paystackRecipientCode,
            reference: transferRef,
          });
          const transferData = transferRes.data?.data;
          payoutData.status = transferData?.status === "success" ? "completed" : "processing";
          payoutData.reference = transferRef;
        } catch (transferErr) {
          console.error("Paystack transfer error:", transferErr.response?.data || transferErr.message);
          // Refund wallet if transfer failed to initiate
          await Seller.findOneAndUpdate({ user: userId }, { $inc: { pendingPayout: amount } });
          return res.status(500).json({ message: "Transfer failed — please try again or contact support" });
        }
      }
      // No bank registered: stays pending for admin to process manually
    } else if (roles.includes("walker")) {
      payoutData.walker = userId;
    } else if (roles.includes("service_provider")) {
      payoutData.provider = userId;
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const payout = await Payout.create(payoutData);
    const statusMsg = payoutData.status === "processing"
      ? "Transfer initiated — you'll receive the funds shortly"
      : payoutData.status === "completed"
      ? "Payout sent to your bank account"
      : "Payout request submitted — please add your bank details to enable instant transfers";
    res.json({ success: true, message: statusMsg, payout });
  } catch (err) {
    console.error("requestPayout error:", err);
    res.status(500).json({ message: "Payout request failed. Please try again." });
  }
};

export const retryPayout = async (req, res) => {
  try {
    const userId = req.user._id;
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    if (payout.seller?.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });
    if (payout.status !== "pending")
      return res.status(400).json({ message: `Payout is already ${payout.status}` });

    const seller = await Seller.findOne({ user: userId });
    if (!seller?.bankDetails?.paystackRecipientCode)
      return res.status(400).json({ message: "No bank account registered. Add your bank details first." });

    const transferRef = `PAYOUT_RETRY_${payout._id}_${Date.now()}`;
    const transferRes = await paystack.post("/transfer", {
      source: "balance",
      reason: "UMP seller payout withdrawal",
      amount: payout.amount * 100,
      recipient: seller.bankDetails.paystackRecipientCode,
      reference: transferRef,
    });

    const transferData = transferRes.data?.data;
    payout.status = transferData?.status === "success" ? "completed" : "processing";
    payout.reference = transferRef;
    await payout.save();

    res.json({ success: true, message: "Transfer initiated successfully", payout });
  } catch (err) {
    console.error("retryPayout error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.message || err.message || "Transfer failed — please try again" });
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
    console.error("getPayoutsForSeller error:", err);
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
      console.warn(`[payoutController] getPayoutSummary timed out for ${role}`);
      return res.json({ success: true, summary: { available: 0, nextPayout: null } });
    }
    return res.json({ success: true, summary: result });
  } catch (err) {
    console.error("getPayoutSummary error:", err);
    res.status(500).json({ message: "Failed to load payout summary" });
  }
};

