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
  forceLogout,
  updateMe,
  googleSignIn,
  linkSchoolEmail,
  verifySchoolEmail,
  getReferralStats,
  lookupReferralCode,
  getVerifyIdentityStatus,
  submitVerifyIdentity,
  disputeVerifyIdentity,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  identityLimiter,
  referralLimiter,
} from "../middleware/rateLimits.js";

const router = express.Router();

// ── Public auth ───────────────────────────────────────────────────────────────
router.post("/signup",         authLimiter,          signup);
router.post("/signup-provider", authLimiter,         signupProvider);
router.post("/login",          authLimiter,          login);
router.post("/google",         authLimiter,          googleSignIn);
router.post("/force-logout",                         forceLogout);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.put ("/reset-password/:token", passwordResetLimiter, resetPassword);
router.post("/verify-otp",     otpLimiter,           verifyOTP);
router.post("/resend-otp",     otpLimiter,           resendOtp);

// ── Protected ─────────────────────────────────────────────────────────────────
router.post("/logout",                    protect, logout);
router.get ("/me",                        protect, getMe);
router.put ("/me",                        protect, updateMe);
router.put ("/change-password",           protect, changePassword);

// ── School email linking ──────────────────────────────────────────────────────
router.post("/link-school-email",         protect, linkSchoolEmail);
router.post("/verify-school-email",       protect, verifySchoolEmail);

// ── Referral stats (MUST be before /referral/:code to avoid param capture) ───
router.get ("/referral/stats",            protect, getReferralStats);

// ── Referral public lookup ────────────────────────────────────────────────────
router.get("/referral/:code",  referralLimiter,      lookupReferralCode);

// ── Identity verification ─────────────────────────────────────────────────────
router.get ("/verify-identity/status",    protect, identityLimiter, getVerifyIdentityStatus);
router.post("/verify-identity",           protect, identityLimiter, submitVerifyIdentity);
router.post("/verify-identity/dispute",   protect, identityLimiter, disputeVerifyIdentity);

export default router;
