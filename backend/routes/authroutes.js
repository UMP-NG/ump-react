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
import User from "../models/User.js";

const router = express.Router();

// ==========================
// AUTH ROUTES
// ==========================
router.post("/signup", signup);
router.post("/signup-provider", signupProvider);
router.post("/login", login);
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
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    })
      .select("-password -wishlist -cart -orders -services -following")
      .lean();
    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/auth/resend-otp", resendOtp);

router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });

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
