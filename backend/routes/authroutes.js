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
      if (typeof np.order === "boolean") updates["notificationPreferences.order"] = np.order;
      if (typeof np.message === "boolean") updates["notificationPreferences.message"] = np.message;
      if (typeof np.payout === "boolean") updates["notificationPreferences.payout"] = np.payout;
      if (typeof np.inventory === "boolean") updates["notificationPreferences.inventory"] = np.inventory;
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select("-password -wishlist -cart -orders -services -following")
      .lean();
    res.json({ message: "Profile updated", user });
  } catch (error) {
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

