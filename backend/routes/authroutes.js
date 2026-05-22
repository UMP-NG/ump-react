import express from "express";
import {
  signup,
  signupProvider,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyOTP,
  logout,
  resendOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter, otpLimiter, passwordResetLimiter } from "../middleware/rateLimits.js";
import User from "../models/User.js";
import { getFirebaseAuth } from "../config/firebaseAdmin.js";
import sendMail from "../utils/sendMail.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";

const router = express.Router();

// ==========================
// AUTH ROUTES
// ==========================
router.post("/signup", authLimiter, signup);
router.post("/signup-provider", authLimiter, signupProvider);
router.post("/login", authLimiter, login);
router.post("/logout", protect, logout);

// 🔴 EMERGENCY: Force clear old invalid tokens
// Use this when JWT signature validation fails
router.post("/force-logout", (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "lax",
      path: "/",
    });
    res.status(200).json({ 
      message: "Token cleared - please login again",
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: "Error clearing token" });
  }
});

// Protected routes
router.get("/me", protect, getMe);

router.put("/me", protect, async (req, res) => {
  try {
    // Whitelist only safe, user-editable fields — prevent privilege escalation
    const { name, phone, address, bio, sellerInfo, serviceProviderInfo, notificationPreferences } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).slice(0, 100);
    if (phone !== undefined) updates.phone = String(phone).slice(0, 20);
    if (address !== undefined) updates.address = String(address).slice(0, 200);
    if (bio !== undefined) updates.bio = String(bio).slice(0, 500);
    if (sellerInfo && typeof sellerInfo === "object") {
      if (sellerInfo.storeName !== undefined) updates["sellerInfo.storeName"] = String(sellerInfo.storeName).slice(0, 100);
      if (sellerInfo.description !== undefined) updates["sellerInfo.description"] = String(sellerInfo.description).slice(0, 500);
      if (sellerInfo.location !== undefined) updates["sellerInfo.location"] = String(sellerInfo.location).slice(0, 200);
      if (sellerInfo.phone !== undefined) updates["sellerInfo.phone"] = String(sellerInfo.phone).slice(0, 20);
    }
    if (serviceProviderInfo && typeof serviceProviderInfo === "object") {
      const spi = serviceProviderInfo;
      if (spi.businessName !== undefined) updates["serviceProviderInfo.businessName"] = String(spi.businessName).slice(0, 100);
      if (spi.bio !== undefined) updates["serviceProviderInfo.bio"] = String(spi.bio).slice(0, 500);
      if (spi.rate !== undefined) updates["serviceProviderInfo.rate"] = Math.max(0, Number(spi.rate) || 0);
      if (["available", "busy", "offline"].includes(spi.availability)) updates["serviceProviderInfo.availability"] = spi.availability;
    }
    if (notificationPreferences && typeof notificationPreferences === "object") {
      const np = notificationPreferences;
      if (typeof np.order      === "boolean") updates["notificationPreferences.order"]      = np.order;
      if (typeof np.message    === "boolean") updates["notificationPreferences.message"]    = np.message;
      if (typeof np.payout     === "boolean") updates["notificationPreferences.payout"]     = np.payout;
      if (typeof np.inventory  === "boolean") updates["notificationPreferences.inventory"]  = np.inventory;
      if (typeof np.account    === "boolean") updates["notificationPreferences.account"]    = np.account;
      if (typeof np.platform   === "boolean") updates["notificationPreferences.platform"]   = np.platform;
      if (typeof np.promotions === "boolean") updates["notificationPreferences.promotions"] = np.promotions;
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select("-password -wishlist -cart -orders -services -following")
      .lean();
    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Google Sign-In via Firebase ────────────────────────────────────────────────
// Accepts ANY Google account. UNILAG emails get full access; others get a limited
// account (view + buy only) until they link and verify their school email.
const UNILAG_EMAIL = /^[1-9]\d{7,}@live\.unilag\.edu\.ng$/i;

router.post("/google", authLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "No ID token provided" });

    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return res.status(503).json({ message: "Google sign-in is not configured on this server yet" });
    }

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const { email, name, picture } = decoded;

    if (!email) return res.status(400).json({ message: "Email not returned by Google" });

    const isUnilag = UNILAG_EMAIL.test(email);

    // Look up by email OR by a previously linked school email
    let user = await User.findOne({ $or: [{ email }, { schoolEmail: email }] });

    if (!user) {
      user = new User({
        name:          name || email.split("@")[0],
        email,
        password:      crypto.randomBytes(32).toString("hex"),
        isVerified:    isUnilag,   // UNILAG email = immediately verified
        googleAccount: !isUnilag,  // non-UNILAG Google accounts are flagged as limited
        avatar:        picture ? { url: picture, publicId: "" } : undefined,
      });
      await user.save({ validateBeforeSave: false });
    }

    const isLimitedAccount = user.googleAccount && !user.isVerified;

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      message: "Google sign-in successful",
      token,
      user: {
        _id:              user._id,
        name:             user.name,
        email:            user.email,
        avatar:           user.avatar,
        isVerified:       user.isVerified,
        googleAccount:    user.googleAccount,
        schoolEmail:      user.schoolEmail || null,
        schoolEmailVerified: user.schoolEmailVerified,
        isLimitedAccount,
        roles:            user.roles,
        bio:              user.bio,
        createdAt:        user.createdAt,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    const msg = error?.code === "auth/argument-error" || error?.code === "auth/id-token-expired"
      ? "Google token is invalid or expired — please try again"
      : "Server error during Google sign-in";
    res.status(500).json({ message: msg });
  }
});

// ── Link school email (step 1: request OTP) ─────────────────────────────────
router.post("/link-school-email", protect, async (req, res) => {
  try {
    const { schoolEmail } = req.body;
    if (!schoolEmail) return res.status(400).json({ message: "School email is required" });
    if (!UNILAG_EMAIL.test(schoolEmail)) {
      return res.status(400).json({ message: "Please enter a valid UNILAG student email (@live.unilag.edu.ng)" });
    }

    // Block if that school email is already the primary email on another account
    const taken = await User.findOne({ email: schoolEmail.toLowerCase() });
    if (taken) {
      return res.status(409).json({
        message: "That school email is already registered as a full account. Please log in with it instead.",
      });
    }

    // Block if another account has already linked this school email
    const linked = await User.findOne({ schoolEmail: schoolEmail.toLowerCase(), _id: { $ne: req.user._id } });
    if (linked) {
      return res.status(409).json({ message: "That school email is already linked to another account." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit OTP and save it temporarily
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.schoolEmailOtp       = otp;
    user.schoolEmailOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.schoolEmail          = schoolEmail.toLowerCase();
    await user.save({ validateModifiedOnly: true });

    await sendMail({
      email:   schoolEmail,
      subject: "Verify your UMP school email",
      type:    "otp",
      otp,
    });

    res.json({ message: "OTP sent to your school email. Enter it to verify." });
  } catch (err) {
    console.error("link-school-email:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Verify school email (step 2: confirm OTP) ────────────────────────────────
router.post("/verify-school-email", protect, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.schoolEmailOtp || !user.schoolEmailOtpExpire) {
      return res.status(400).json({ message: "No pending school email verification. Request a new OTP first." });
    }
    if (user.schoolEmailOtpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }
    if (user.schoolEmailOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    user.schoolEmailVerified  = true;
    user.isVerified           = true;   // unlocks full access
    user.schoolEmailOtp       = undefined;
    user.schoolEmailOtpExpire = undefined;
    await user.save({ validateModifiedOnly: true });

    res.json({
      message: "School email verified! Your account now has full access.",
      user: {
        _id:                 user._id,
        isVerified:          true,
        schoolEmail:         user.schoolEmail,
        schoolEmailVerified: true,
        isLimitedAccount:    false,
      },
    });
  } catch (err) {
    console.error("verify-school-email:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Save FCM push-notification token ─────────────────────────────────────────
router.put("/fcm-token", protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken: fcmToken || null });
    res.json({ message: "FCM token updated" });
  } catch (err) {
    console.error("🔴 [fcm-token] update failed:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.put("/reset-password/:token", passwordResetLimiter, resetPassword);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOtp);

router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields are required" });
    if (newPassword.length < 8)
      return res.status(400).json({ message: "New password must be at least 8 characters" });

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

