import mongoose from "mongoose";
import VerificationRequest from "../models/VerificationRequest.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";
import { awardReferralCredit, CREDIT_GOOGLE_VERIFIED } from "./authController.js";

export const getPendingVerifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 4, 20);
    const requests = await VerificationRequest.find({ status: "pending" })
      .sort({ createdAt: -1 }).limit(limit).populate("user", "name email").lean();
    const results = requests.map((r) => ({
      _id: r._id, ownerName: r.user?.name || "—", email: r.user?.email || "—", createdAt: r.createdAt,
    }));
    res.json({ verifications: results, total: results.length });
  } catch (err) {
    logger.error("getPendingVerifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getIdentityVerifications = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      VerificationRequest.find(filter)
        .populate("user","name email avatar").populate("conflictWith","name email")
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      VerificationRequest.countDocuments(filter),
    ]);
    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    logger.error("getIdentityVerifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const approveIdentityVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid request ID" });

    // Read first so the self-approval guard runs before any DB write.
    const existing = await VerificationRequest.findOne(
      { _id: id, status: { $ne: "approved" } },
      { user: 1 }
    ).lean();
    if (!existing) return res.status(404).json({ message: "Request not found or already approved" });
    if (existing.user.toString() === req.user._id.toString())
      return res.status(403).json({ message: "You cannot approve your own verification request." });

    // Atomic state transition — the $ne guard prevents double-approval under concurrent requests.
    const verReq = await VerificationRequest.findOneAndUpdate(
      { _id: id, status: { $ne: "approved" } },
      { $set: { status: "approved", adminNote: note || "" } },
      { new: true, projection: { user: 1 } }
    ).lean();
    if (!verReq) return res.status(404).json({ message: "Request not found or already approved" });

    // googleAccount: false ensures the account is no longer treated as limited even if the
    // user originally signed in with Google.
    await User.findByIdAndUpdate(verReq.user, { isVerified: true, googleAccount: false });

    res.json({ message: "Verification approved and user account unlocked." });

    setImmediate(async () => {
      try {
        // Award the remaining referral credit to whoever referred this user, unless the
        // school-email OTP path already paid it (schoolEmailVerified: true).
        const fullUser = await User.findById(verReq.user)
          .select("referredBy schoolEmailVerified name email").lean();
        if (
          fullUser?.referredBy &&
          !fullUser.schoolEmailVerified &&
          !fullUser.referredBy.equals(verReq.user)
        ) {
          awardReferralCredit(
            fullUser.referredBy,
            CREDIT_GOOGLE_VERIFIED,
            `${fullUser.name || fullUser.email} verified their student identity — you've earned the remaining ₦${CREDIT_GOOGLE_VERIFIED} referral credit!`
          );
        }
        await notify(verReq.user, {
          type:    "account",
          title:   "Identity verified — full access unlocked",
          message: "Your student identity has been verified. You can now sell, list properties, and offer services on UMP.",
          link:    "/settings",
        });
      } catch (e) {
        logger.error("approveIdentityVerification post-response:", e);
      }
    });
  } catch (err) {
    logger.error("approveIdentityVerification:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
};

export const rejectIdentityVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid request ID" });
    const verReq = await VerificationRequest.findOneAndUpdate(
      { _id: id, status: { $nin: ["approved","rejected"] } },
      { $set: { status: "rejected", adminNote: note || "" } },
      { new: true, projection: { user: 1, adminNote: 1 } }
    ).lean();
    if (!verReq) return res.status(404).json({ message: "Request not found or already resolved" });
    res.json({ message: "Verification rejected." });
    setImmediate(() => {
      notify(verReq.user, { type: "account", title: "Identity verification rejected", message: verReq.adminNote ? `Your verification was rejected: ${verReq.adminNote}. Please re-submit with clearer documents.` : "Your verification request was rejected. Please re-submit with clearer documents.", link: "/settings?tab=verify" }).catch(() => {});
    });
  } catch (err) {
    logger.error("rejectIdentityVerification:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
};
