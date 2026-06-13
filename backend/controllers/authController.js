import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

// ─── Referral credit amounts ──────────────────────────────────────────────────
const CREDIT_SCHOOL_EMAIL = 100; // ₦100 for verified UNILAG email signup
const CREDIT_GOOGLE_UNVERIFIED = 50; // ₦50 for Google (non-UNILAG) signup
export const CREDIT_GOOGLE_VERIFIED = 50;   // ₦50 extra when that Google account links school email

export async function awardReferralCredit(referrerId, amount, reason) {
  if (!referrerId || amount <= 0) return;
  try {
    await User.findByIdAndUpdate(referrerId, { $inc: { referralCredit: amount } });
    await notify(referrerId, {
      type:    "account",
      title:   `+₦${amount} referral credit earned!`,
      message: reason,
      link:    "/settings",
    });
  } catch (err) {
    logger.error("[awardReferralCredit]", err.message);
  }
}
import sendMail from "../utils/sendMail.js";
import generateToken from "../utils/generateToken.js";
import Service from "../models/Service.js";
import { audit } from "../utils/auditLog.js";
import VerificationRequest from "../models/VerificationRequest.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Listing from "../models/Listing.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";
import Negotiation from "../models/Negotiation.js";
import Payment from "../models/Payment.js";
import Payout from "../models/Payout.js";
import Review from "../models/Review.js";
import Cart from "../models/Cart.js";
import Seller from "../models/Seller.js";
import Follow from "../models/Follow.js";
import PushSub from "../models/PushSub.js";
import { getFirebaseAuth } from "../config/firebaseAdmin.js";
import { notify } from "../utils/notify.js";
import { sendPushToUser } from "./pushController.js";
import { getIO } from "../utils/socket.js";
import logger from "../utils/logger.js";

// ===============================
// SIGNUP WITH OTP
// ===============================
const UNILAG_EMAIL = /^[1-9]\d{7,}@live\.unilag\.edu\.ng$/i;

export const signup = async (req, res) => {
  try {
    const { email, password, name, referralCode } = req.body;

    // Fix #11: enforce minimum password length at the backend
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    // Enforce UNILAG email at application level (regular signup only)
    if (!UNILAG_EMAIL.test(email)) {
      return res.status(400).json({
        message: "Only UNILAG student emails (@live.unilag.edu.ng) are allowed. Use Google sign-in for other accounts.",
      });
    }

    const maskedEmail = email?.replace(/(?<=.{2}).(?=[^@]*@)/g, "*");
    logger.debug("🔐 [SIGNUP] Request received:", { email: maskedEmail, name, passwordLength: password?.length });

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      logger.debug("⚠️  [SIGNUP] User already exists and verified:", maskedEmail);
      return res.status(400).json({ message: "User already exists" });
    }

    let user;
    if (existingUser && !existingUser.isVerified) {
      // Resend OTP for unverified user — also update name and password so
      // re-signup heals accounts that were created with the old double-hash bug
      logger.debug("🔄 [SIGNUP] User exists but not verified, resending OTP:", maskedEmail);
      if (name) existingUser.name = name;
      existingUser.password = password; // pre-save hook will hash it correctly
      const otp = existingUser.createOTP();
      await existingUser.save({ validateBeforeSave: false });

      try {
        await sendMail({
          email: email,
          subject: "Your OTP Code",
          type: "otp",
          otp: otp,
        });
        logger.debug("📧 [SIGNUP] OTP sent to existing unverified user:", maskedEmail);
      } catch (err) {
        logger.error("❌ [SIGNUP] Error sending OTP:", err.message);
        // Error logged at mail service level
      }

      return res.status(200).json({ message: "OTP sent successfully" });
    }

    // Resolve referrer if a referral code was provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select("_id").lean();
      if (referrer) referrerId = referrer._id;
    }

    // Create new unverified user — pre-save hook handles hashing
    user = new User({
      name: name || undefined,
      email,
      password,
      isVerified: false,
      ...(referrerId && { referredBy: referrerId }),
    });

    const otp = user.createOTP();
    await user.save();
    logger.debug("✅ [SIGNUP] New user created:", email);

    try {
      await sendMail({
        email: email,
        subject: "Your OTP Code",
        type: "otp",
        otp: otp,
      });
      logger.debug("📧 [SIGNUP] OTP sent to new user:", maskedEmail);
    } catch (err) {
      logger.error("❌ [SIGNUP] Error sending OTP to new user:", err.message);
      // Error logged at mail service level
    }

    res.status(201).json({ message: "User created. OTP sent to your email." });
  } catch (error) {
    logger.error("❌ [SIGNUP] Server error:", error.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ===============================
// SIGNUP + CREATE SERVICE (instant provider signup)
// Accepts multipart/form-data (image) or JSON body.
export const signupProvider = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      businessName,
      title,
      major,
      desc,
      about,
      rate,
      tags,
    } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Fix #2: enforce UNILAG email on provider signup the same as regular signup
    if (!UNILAG_EMAIL.test(email)) {
      return res.status(400).json({ message: "Only UNILAG student emails (@live.unilag.edu.ng) are allowed." });
    }

    // Fix #11: minimum password length
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    // Create user and mark verified — pre-save hook handles hashing
    const user = await User.create({
      name: name || businessName || email.split("@")[0],
      email,
      password,
      isVerified: true,
      roles: ["service_provider"],
    });

    // Create service
    const serviceData = {
      provider: user._id,
      name: businessName || name || user.name,
      title: title || "",
      major: major || "",
      desc: desc || "",
      about: about || "",
      rate: Number(rate) || 0,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      image: req.file ? { url: req.file.path, publicId: req.file.filename } : null,
      available: true,
    };

    const service = await Service.create(serviceData);

    // Link service to user
    user.services = user.services || [];
    user.services.push(service._id);
    user.serviceProviderInfo = user.serviceProviderInfo || {};
    user.serviceProviderInfo.businessName = businessName || user.name;
    user.serviceProviderInfo.skills = service.tags || [];
    user.serviceProviderInfo.rate = service.rate || 0;
    user.serviceProviderInfo.bio = service.about || "";

    await user.save();

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in prod (HTTPS), false locally
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // lax locally, none in prod
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "Provider account created",
      token,
      user: {
        _id:       user._id,
        name:      user.name,
        email:     user.email,
        roles:     user.roles,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      service: { _id: service._id, title: service.title },
    });
  } catch (error) {
    logger.error("❌ [SIGNUP_PROVIDER] Server error:", error.message);
    res.status(500).json({ message: "Server error. Please try again." }); // Fix #7
  }
};

// ===============================
// VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    // Check expiry first, then constant-time comparison against stored SHA-256 hash
    if (!user.otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const hashedInput = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const storedBuf   = Buffer.from(user.otp);
    const inputBuf    = Buffer.from(hashedInput);
    const otpMatch    = storedBuf.length === inputBuf.length && crypto.timingSafeEqual(storedBuf, inputBuf);
    if (!otpMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Award referral credit to whoever referred this user (fire-and-forget)
    // Guard: skip if the referrer ID somehow equals the new user (self-referral)
    if (user.referredBy && !user.referredBy.equals(user._id)) {
      setImmediate(() => awardReferralCredit(
        user.referredBy,
        CREDIT_SCHOOL_EMAIL,
        `${user.name || user.email} signed up with your referral code using their UNILAG email.`
      ));
    }

    // Issue auth cookie so the user is immediately logged in
    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isVerified: true,
        roles: user.roles,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Also match schoolEmail so users can still log in with their original
    // address after an account merge (source email gets anonymised, but
    // primary retains it as schoolEmail).
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { schoolEmail: email.toLowerCase() }],
    });
    if (!existingUser) {
      // Generic message — avoids revealing whether the email is registered
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check account lockout
    if (existingUser.isLocked) {
      await existingUser.incLoginAttempts();
      const remainingMs = existingUser.lockUntil - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return res.status(429).json({ message: `Account temporarily locked. Try again in ${remainingMins} minute(s).` });
    }

    // Check email verification
    if (!existingUser.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email with the OTP first." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect) {
      await existingUser.incLoginAttempts();
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Reset lockout counter on successful login
    if (existingUser.loginAttempts > 0) {
      await existingUser.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });
    } else {
      await existingUser.updateOne({ $set: { lastLogin: new Date() } });
    }

    let token;
    try {
      token = generateToken(existingUser._id);
      if (!token) {
        throw new Error("generateToken returned null or undefined");
      }
    } catch (tokenErr) {
      // Token generation failed - server configuration error
      return res.status(500).json({ 
        message: "Token generation failed - server configuration error",
        error: process.env.NODE_ENV === "development" ? tokenErr.message : undefined
      });
    }

    // Set token in cookie with error handling
    try {
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"  // Explicit path to prevent cookie loss
      });
    } catch (cookieErr) {
      // Cookie configuration error
      return res.status(500).json({ message: "Cookie configuration error" });
    }
    
    audit("LOGIN_SUCCESS", { actor: existingUser._id, entity: "User", entityId: existingUser._id, req });

    // Token is returned in the body so the frontend can store it in localStorage
    // and send it as a Bearer header — required on iOS Safari where ITP blocks
    // cross-origin httpOnly cookies (frontend on myump.com.ng, backend on onrender.com).
    // The httpOnly cookie is still set for same-origin and non-Safari browsers.
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: existingUser.avatar,
        isVerified: existingUser.isVerified,
        roles: existingUser.roles,
        bio: existingUser.bio,
        createdAt: existingUser.createdAt,
      },
    });
    
  } catch (error) {
    // CRITICAL: Must always send response to avoid ERR_EMPTY_RESPONSE
    if (!res.headersSent) {
      res.status(500).json({ 
        message: "Server error during login",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
};

// ===============================
// GET LOGGED-IN USER
// ===============================
export const getMe = (req, res) => {
  // req.user is already populated by the protect middleware — no second DB query needed
  // Explicitly pick fields to avoid leaking internal ones (fcmToken, __v, etc.)
  const u = req.user;
  res.status(200).json({
    message: "User fetched successfully",
    user: {
      _id:             u._id,
      name:            u.name,
      email:           u.email,
      roles:           u.roles,
      avatar:          u.avatar,
      phone:           u.phone,
      address:         u.address,
      isVerified:      u.isVerified,
      googleAccount:   u.googleAccount,
      schoolEmail:     u.schoolEmail,
      schoolEmailVerified: u.schoolEmailVerified,
      status:          u.status,
      createdAt:       u.createdAt,
      isLimitedAccount:         !!(u.googleAccount && !u.isVerified),
      notificationPreferences:  u.notificationPreferences || {},
      serviceProviderInfo:      u.serviceProviderInfo,
      referralCode:             u.referralCode,
      referralCredit:           u.referralCredit || 0,
    },
  });
};

// ===============================
// FORGOT PASSWORD
// ===============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    try {
      await sendMail({
        email: email,
        subject: "Password Reset",
        type: "reset",
        resetUrl: resetUrl,
      });
    } catch (err) {
      // Error logged at mail service level
    }

    // Fix #4: never return the reset URL in the API response — only send it via email.
    // Returning it here would expose the token to any log aggregator or MITM.
    res.status(200).json({ message: "If that email exists, a password reset link has been sent." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// RESET PASSWORD
// ===============================
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      expires: new Date(0),
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    // Return identical response whether the email exists or not — prevents enumeration
    if (!user || user.isVerified) {
      return res.status(200).json({ message: "OTP resent successfully" });
    }

    const otp = user.createOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendMail({ email, type: "otp", otp });
    } catch (mailErr) {
      logger.error("❌ [RESEND-OTP] Email delivery failed:", mailErr.message);
      return res.status(200).json({
        message: "OTP generated but email delivery failed — check your spam folder or try again shortly.",
        deliveryFailed: true,
      });
    }

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

// ─── Force-logout (clears the httpOnly cookie) ───────────────────────────────
export const forceLogout = (req, res) => {
  try {
    res.cookie("token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", expires: new Date(0), path: "/" });
    res.status(200).json({ message: "Token cleared - please login again", success: true });
  } catch (error) {
    res.status(500).json({ message: "Error clearing token" });
  }
};

// ─── Update own profile (PUT /me) ────────────────────────────────────────────
export const updateMe = async (req, res) => {
  try {
    const { name, phone, address, bio, sellerInfo, serviceProviderInfo, notificationPreferences } = req.body;
    const updates = {};
    if (name    !== undefined) updates.name    = String(name).slice(0, 100);
    if (phone   !== undefined) updates.phone   = String(phone).slice(0, 20);
    if (address !== undefined) updates.address = String(address).slice(0, 200);
    if (bio     !== undefined) updates.bio     = String(bio).slice(0, 500);
    if (sellerInfo && typeof sellerInfo === "object") {
      if (sellerInfo.storeName   !== undefined) updates["sellerInfo.storeName"]   = String(sellerInfo.storeName).slice(0, 100);
      if (sellerInfo.description !== undefined) updates["sellerInfo.description"] = String(sellerInfo.description).slice(0, 500);
      if (sellerInfo.location    !== undefined) updates["sellerInfo.location"]    = String(sellerInfo.location).slice(0, 200);
      if (sellerInfo.phone       !== undefined) updates["sellerInfo.phone"]       = String(sellerInfo.phone).slice(0, 20);
    }
    if (serviceProviderInfo && typeof serviceProviderInfo === "object") {
      const spi = serviceProviderInfo;
      if (spi.businessName !== undefined) updates["serviceProviderInfo.businessName"] = String(spi.businessName).slice(0, 100);
      if (spi.bio          !== undefined) updates["serviceProviderInfo.bio"]          = String(spi.bio).slice(0, 500);
      if (spi.rate         !== undefined) updates["serviceProviderInfo.rate"]         = Math.max(0, Number(spi.rate) || 0);
      if (["available", "busy", "offline"].includes(spi.availability)) {
        updates["serviceProviderInfo.availability"] = spi.availability;
      }
    }
    if (notificationPreferences && typeof notificationPreferences === "object") {
      const np = notificationPreferences;
      const npFields = ["order","message","payout","inventory","account","platform","promotions"];
      for (const f of npFields) {
        if (typeof np[f] === "boolean") updates[`notificationPreferences.${f}`] = np[f];
      }
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select("-password -wishlist -cart -orders -services -following")
      .lean();
    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Google Sign-In via Firebase ─────────────────────────────────────────────
const GOOGLE_UNILAG_EMAIL = /^[1-9]\d{7,}@live\.unilag\.edu\.ng$/i;

export const googleSignIn = async (req, res) => {
  try {
    const { idToken, referralCode } = req.body;
    if (!idToken) return res.status(400).json({ message: "No ID token provided" });

    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return res.status(503).json({ message: "Google sign-in is not configured on this server yet" });
    }

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const { email, name, picture } = decoded;
    if (!email) return res.status(400).json({ message: "Email not returned by Google" });

    const isUnilag = GOOGLE_UNILAG_EMAIL.test(email);
    let user = await User.findOne({ $or: [{ email }, { schoolEmail: email }] });

    if (!user) {
      // Resolve referrer for new accounts only
      let referrerId = null;
      if (referralCode) {
        const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select("_id").lean();
        if (referrer) referrerId = referrer._id;
      }
      user = new User({
        name:          name || email.split("@")[0],
        email,
        password:      crypto.randomBytes(32).toString("hex"),
        isVerified:    isUnilag,
        googleAccount: !isUnilag,
        avatar:        picture ? { url: picture, publicId: "" } : undefined,
        ...(referrerId && { referredBy: referrerId }),
      });
      await user.save({ validateBeforeSave: false });

      // Award referral credit (fire-and-forget after save)
      if (referrerId) {
        const creditAmount = isUnilag ? CREDIT_SCHOOL_EMAIL : CREDIT_GOOGLE_UNVERIFIED;
        const reason = isUnilag
          ? `${user.name || email} joined UMP with your referral link using their UNILAG email.`
          : `${user.name || email} joined UMP with your referral link. You'll earn ₦${CREDIT_GOOGLE_VERIFIED} more when they verify their school email.`;
        setImmediate(() => awardReferralCredit(referrerId, creditAmount, reason));
      }
    }

    const isLimitedAccount = user.googleAccount && !user.isVerified;
    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     "/",
    });
    res.json({
      message: "Google sign-in successful",
      token,
      user: {
        _id: user._id, name: user.name, email: user.email, avatar: user.avatar,
        isVerified: user.isVerified, googleAccount: user.googleAccount,
        schoolEmail: user.schoolEmail || null, schoolEmailVerified: user.schoolEmailVerified,
        isLimitedAccount, roles: user.roles, bio: user.bio, createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error("Google auth error:", error);
    const msg = error?.code === "auth/argument-error" || error?.code === "auth/id-token-expired"
      ? "Google token is invalid or expired — please try again"
      : "Server error during Google sign-in";
    res.status(500).json({ message: msg });
  }
};

// ─── Merge all data from a source account into the primary account ────────────
async function mergeAccounts(primary, source) {
  const src = source._id;
  const dst = primary._id;

  // Transfer every single-ref ownership field across all collections.
  // allSettled so one wrong field name / duplicate-key never aborts the whole merge.
  await Promise.allSettled([
    // Orders
    Order.updateMany({ buyer:    src }, { $set: { buyer:    dst } }),
    Order.updateMany({ seller:   src }, { $set: { seller:   dst } }),
    // Products
    Product.updateMany({ seller: src }, { $set: { seller:   dst } }),
    Product.updateMany({ likes:  src }, { $pull: { likes:   src } }),
    // Services
    Service.updateMany({ provider: src }, { $set: { provider: dst } }),
    Service.updateMany({ likes:    src }, { $pull: { likes:   src } }),
    // Listings
    Listing.updateMany({ owner:     src }, { $set: { owner:     dst } }),
    Listing.updateMany({ likes:     src }, { $pull: { likes:     src } }),
    Listing.updateMany({ favorites: src }, { $pull: { favorites: src } }),
    // Bookings
    Booking.updateMany({ user:     src }, { $set: { user:     dst } }),
    Booking.updateMany({ provider: src }, { $set: { provider: dst } }),
    // Messages
    Message.updateMany({ sender:   src }, { $set: { sender:   dst } }),
    Message.updateMany({ receiver: src }, { $set: { receiver: dst } }),
    Message.updateMany({ readBy:   src }, { $pull: { readBy:   src } }),
    // Negotiations
    Negotiation.updateMany({ buyer:  src }, { $set: { buyer:  dst } }),
    Negotiation.updateMany({ seller: src }, { $set: { seller: dst } }),
    // Payments & payouts
    Payment.updateMany({ user:     src }, { $set: { user:    dst } }),
    Payout.updateMany({ seller:   src }, { $set: { seller:  dst } }),
    Payout.updateMany({ provider: src }, { $set: { provider: dst } }),
    // Reviews
    Review.updateMany({ author: src }, { $set: { author: dst } }),
    // Seller profile
    Seller.updateMany({ user:      src }, { $set: { user:      dst } }),
    Seller.updateMany({ followers: src }, { $pull: { followers: src } }),
    // Social graph
    Follow.updateMany({ follower:  src }, { $set: { follower:  dst } }),
    Follow.updateMany({ following: src }, { $set: { following: dst } }),
    // Notifications, verification, push subs
    Notification.updateMany({ user:      src }, { $set: { user: dst } }),
    VerificationRequest.updateMany({ user: src }, { $set: { user: dst } }),
    PushSub.updateMany({ user:     src }, { $set: { user: dst } }),
  ]);

  // Merge Cart — fold source items into primary cart (skip duplicates)
  const srcCart = await Cart.findOne({ user: src });
  if (srcCart?.items?.length) {
    const dstCart = await Cart.findOne({ user: dst });
    if (!dstCart) {
      await Cart.findByIdAndUpdate(srcCart._id, { $set: { user: dst } });
    } else {
      for (const item of srcCart.items) {
        const clash = dstCart.items.find(
          (i) => i.product.toString() === item.product.toString()
        );
        if (!clash) dstCart.items.push(item);
      }
      await dstCart.save({ validateModifiedOnly: true });
      await Cart.deleteOne({ _id: srcCart._id });
    }
  }

  // Merge User-level embedded arrays + referral credit
  const mergedRoles = [...new Set([...primary.roles, ...source.roles])];
  const $set = { roles: mergedRoles };
  // Fill profile gaps: keep primary's data, backfill from source only where empty
  if (!primary.name        && source.name)        $set.name        = source.name;
  if (!primary.phone       && source.phone)       $set.phone       = source.phone;
  if (!primary.address     && source.address)     $set.address     = source.address;
  if (!primary.bio         && source.bio)         $set.bio         = source.bio;
  if (!primary.avatar?.url && source.avatar?.url) $set.avatar      = source.avatar;
  if (!primary.sellerInfo?.storeName && source.sellerInfo?.storeName) {
    $set.sellerInfo = source.sellerInfo;
  }
  if (!primary.serviceProviderInfo?.businessName && source.serviceProviderInfo?.businessName) {
    $set.serviceProviderInfo = source.serviceProviderInfo;
  }

  // Preserve all login methods after merge:
  // If the primary is a Google account and the source has password auth,
  // copy the source's hashed password so the user can still log in with
  // their original email + password via the schoolEmail lookup in login().
  const sourceOriginalEmail = source.email;
  if (primary.googleAccount && source.password && !source.googleAccount) {
    $set.password = source.password;
  }
  // Store source's original email as the primary's schoolEmail so login
  // with the old address still resolves to the primary account.
  if (!primary.schoolEmail && sourceOriginalEmail && !sourceOriginalEmail.includes("@ump-merged.internal")) {
    $set.schoolEmail = sourceOriginalEmail.toLowerCase();
    $set.schoolEmailVerified = true;
  }

  await User.findByIdAndUpdate(dst, {
    $set,
    $inc:      { referralCredit: source.referralCredit || 0 },
    $addToSet: {
      services:  { $each: source.services  || [] },
      wishlist:  { $each: source.wishlist  || [] },
      orders:    { $each: source.orders    || [] },
      following: { $each: source.following || [] },
    },
  });

  // Disable and anonymise the old account so it can no longer be logged into
  await User.findByIdAndUpdate(src, {
    $set: {
      status:     "inactive",
      email:      `merged_${src}@ump-merged.internal`,
      isVerified: false,
    },
  });
}

// ─── Link school email — step 1: send OTP ────────────────────────────────────
const LINK_UNILAG_EMAIL = /^[1-9]\d{7,}@live\.unilag\.edu\.ng$/i;

export const linkSchoolEmail = async (req, res) => {
  try {
    const { schoolEmail } = req.body;
    if (!schoolEmail) return res.status(400).json({ message: "School email is required" });
    if (!LINK_UNILAG_EMAIL.test(schoolEmail)) {
      return res.status(400).json({ message: "Please enter a valid UNILAG student email (@live.unilag.edu.ng)" });
    }
    const taken = await User.findOne({ email: schoolEmail.toLowerCase() });
    if (taken) {
      if (taken._id.equals(req.user._id)) {
        return res.status(400).json({ message: "This is already your account email." });
      }
      // The school email belongs to an existing account — OTP proves ownership.
      // verifySchoolEmail will merge both accounts automatically after verification.
    }
    const linked = await User.findOne({ schoolEmail: schoolEmail.toLowerCase(), _id: { $ne: req.user._id } });
    if (linked) {
      return res.status(409).json({ message: "That school email is already linked to another account." });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = String(crypto.randomInt(100000, 1000000));
    user.schoolEmailOtp       = crypto.createHash("sha256").update(otp).digest("hex");
    user.schoolEmailOtpExpire = Date.now() + 10 * 60 * 1000;
    user.schoolEmail          = schoolEmail.toLowerCase();
    await user.save({ validateModifiedOnly: true });

    await sendMail({ email: schoolEmail, subject: "Verify your UMP school email", type: "otp", otp });
    res.json({ message: "OTP sent to your school email. Enter it to verify." });
  } catch (err) {
    logger.error("link-school-email:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Verify school email — step 2: confirm OTP ───────────────────────────────
export const verifySchoolEmail = async (req, res) => {
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
    const hashedOtpInput = crypto.createHash("sha256").update(String(otp)).digest("hex");
    const storedBuf      = Buffer.from(user.schoolEmailOtp);
    const inputBuf       = Buffer.from(hashedOtpInput);
    const match = storedBuf.length === inputBuf.length && crypto.timingSafeEqual(storedBuf, inputBuf);
    if (!match) {
      return res.status(400).json({ message: "Incorrect OTP." });
    }
    user.schoolEmailVerified  = true;
    user.isVerified           = true;
    user.schoolEmailOtp       = undefined;
    user.schoolEmailOtpExpire = undefined;
    await user.save({ validateModifiedOnly: true });

    // If the school email was a full account, merge it into this (Google) account
    let merged = false;
    const existingAccount = await User.findOne({ email: user.schoolEmail });
    if (existingAccount && !existingAccount._id.equals(user._id)) {
      // Notify the account being absorbed so the owner can contact support if
      // they did not initiate this merge (e.g. their email was phished).
      try {
        await sendMail({
          email: existingAccount.email,
          subject: "Important: Your UMP account is being merged",
          message:
            `Your UMP account (${existingAccount.email}) is being merged into another account ` +
            `because both accounts share the same verified school email address. ` +
            `All your orders, products, services, and balances will be transferred to the linked account. ` +
            `If you did NOT authorise this action, please contact support immediately at support@myump.com.ng ` +
            `before the merge completes.`,
        });
      } catch (mailErr) {
        logger.warn("merge-notify-email:", mailErr);
      }
      try {
        await mergeAccounts(user, existingAccount);
        merged = true;
      } catch (mergeErr) {
        logger.error("merge-accounts:", mergeErr);
        // Don't fail the verification response — school email is already saved
      }
    }

    res.json({
      message: merged
        ? "School email verified and accounts merged! All your data has been combined into one account."
        : "School email verified! Your account now has full access.",
      merged,
      user: { _id: user._id, isVerified: true, schoolEmail: user.schoolEmail, schoolEmailVerified: true, isLimitedAccount: false },
    });

    // Award the remaining ₦50 to whoever referred this user (they got ₦50 at signup)
    if (user.referredBy && user.googleAccount && !user.referredBy.equals(user._id)) {
      setImmediate(() => awardReferralCredit(
        user.referredBy,
        CREDIT_GOOGLE_VERIFIED,
        `${user.name || user.email} verified their school email — you've earned the remaining ₦${CREDIT_GOOGLE_VERIFIED} referral credit!`
      ));
    }
  } catch (err) {
    logger.error("verify-school-email:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Referral stats ───────────────────────────────────────────────────────────
export const getReferralStats = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select("referralCode referralCredit");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Lazy-generate a referral code for users who signed up before the feature existed
    if (!user.referralCode) {
      await user.save({ validateModifiedOnly: true }); // pre-save hook creates the code
      user = await User.findById(req.user._id).select("referralCode referralCredit").lean();
    }

    const count = await User.countDocuments({ referredBy: req.user._id });
    res.json({ count, referralCode: user.referralCode, creditBalance: user.referralCredit || 0 });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Referral code lookup ─────────────────────────────────────────────────────
export const lookupReferralCode = async (req, res) => {
  try {
    const user = await User.findOne({ referralCode: req.params.code.toUpperCase() })
      .select("name avatar referralCode").lean();
    if (!user) return res.status(404).json({ message: "Referral code not found" });
    res.json({ valid: true, name: user.name, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Identity verification helpers ───────────────────────────────────────────
async function _notifyAdmins(title, message, link) {
  try {
    const adminIds = await User.find({ roles: "admin" }, { _id: 1 }).lean();
    if (!adminIds.length) return;
    const now = new Date();
    const docs = adminIds.map((a) => ({ user: a._id, type: "system", title, message, link, read: false, createdAt: now, updatedAt: now }));
    const inserted = await Notification.insertMany(docs, { ordered: false });
    const io = getIO();
    if (io) {
      inserted.forEach((n) =>
        io.to(n.user.toString()).emit("new_notification", {
          _id: n._id, type: n.type, title: n.title, message: n.message,
          link: n.link, read: false, createdAt: n.createdAt,
        })
      );
    }
    // Browser push for each admin
    for (const a of adminIds) {
      sendPushToUser(a._id, { title, body: message, url: link }).catch(() => {});
    }
  } catch (err) {
    logger.error("[notifyAdmins]", err.message);
  }
}

// ─── Get identity verification status ────────────────────────────────────────
export const getVerifyIdentityStatus = async (req, res) => {
  try {
    const req_ = await VerificationRequest.findOne(
      { user: req.user._id },
      { documentPublicId: 0 }
    ).sort({ createdAt: -1 }).lean();
    res.json({ request: req_ || null });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Submit identity verification ────────────────────────────────────────────
export const submitVerifyIdentity = async (req, res) => {
  try {
    const { institution, firstName, middleName, lastName, matricNumber, department, faculty, documentUrl, documentPublicId } = req.body;
    if (!institution || !firstName || !lastName || !matricNumber || !department || !faculty || !documentUrl) {
      return res.status(400).json({ message: "All fields and a document upload are required." });
    }
    const _cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const _validDoc = _cloud
      ? new RegExp(`^https://res\\.cloudinary\\.com/${_cloud}/`, "i")
      : /^https:\/\/res\.cloudinary\.com\//i;
    if (!_validDoc.test(documentUrl)) {
      return res.status(400).json({ message: "Invalid document URL. Please upload via the UMP upload service." });
    }
    const normInstitution = institution.trim().toLowerCase();
    const normMatric      = matricNumber.trim().toUpperCase();

    const [existing, duplicate] = await Promise.all([
      VerificationRequest.findOne(
        { user: req.user._id, status: { $in: ["pending", "approved", "conflict"] } },
        { status: 1 }
      ).lean(),
      VerificationRequest.findOne(
        { institution: normInstitution, matricNumber: normMatric, status: "approved" },
        { user: 1 }
      ).lean(),
    ]);

    if (existing) {
      return res.status(409).json({
        message: existing.status === "approved" ? "Your account is already verified." : "You already have a pending verification request.",
        status: existing.status,
      });
    }

    const isConflict  = !!duplicate;
    const conflictWith = duplicate?.user || null;

    const verReq = await VerificationRequest.create({
      user: req.user._id, institution: normInstitution,
      firstName: firstName.trim().toLowerCase(), middleName: (middleName || "").trim().toLowerCase(),
      lastName: lastName.trim().toLowerCase(), matricNumber: normMatric,
      department: department.trim(), faculty: faculty.trim(),
      documentUrl, documentPublicId: documentPublicId || "",
      status: isConflict ? "conflict" : "pending", conflictWith,
    });

    res.status(201).json({
      message: isConflict
        ? "A conflict was detected — this matric number is already linked to an account. You can raise a dispute if you are the rightful owner."
        : "Verification request submitted. An admin will review your documents shortly.",
      status: isConflict ? "conflict" : "pending",
      requestId: verReq._id,
    });

    setImmediate(() => {
      (async () => {
        if (isConflict) {
          await notify(req.user._id, {
            type: "account", title: "Verification conflict detected",
            message: `Matric number ${normMatric} at ${institution} is already linked to another account. Raise a dispute if you are the rightful owner.`,
            link: "/settings?tab=verify",
          });
          await _notifyAdmins("Identity verification conflict",
            `${req.user.name || req.user.email} submitted verification for ${normMatric} at ${institution} — already verified by another account.`,
            "/admin/verifications");
        } else {
          await _notifyAdmins("New identity verification request",
            `${req.user.name || req.user.email} submitted a document verification request (${normMatric} at ${institution}).`,
            "/admin/verifications");
        }
      })().catch((e) => logger.error("[verify-identity notifications]", e.message));
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "You already have a pending verification request." });
    }
    logger.error("verify-identity:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
};

// ─── Dispute an identity conflict ────────────────────────────────────────────
export const disputeVerifyIdentity = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Please explain why you are the rightful owner of this identity." });

    const verReq = await VerificationRequest.findOneAndUpdate(
      { user: req.user._id, status: "conflict" },
      { $set: { disputeReason: reason.trim(), disputeRaisedAt: new Date() } },
      { new: true, projection: { matricNumber: 1, user: 1 } }
    ).lean();

    if (!verReq) return res.status(404).json({ message: "No conflict request found for your account." });

    res.json({ message: "Your dispute has been submitted. An admin will review both accounts." });

    setImmediate(() => {
      // Confirm to the applicant their dispute was logged
      notify(req.user._id, {
        type:    "account",
        title:   "Dispute submitted",
        message: "Your identity dispute has been received. An admin will review both accounts and get back to you.",
        link:    "/settings?tab=verify",
      }).catch(() => {});

      _notifyAdmins(
        "Identity dispute raised",
        `${req.user.name || req.user.email} raised a dispute for matric ${verReq.matricNumber}.`,
        "/admin/verifications"
      ).catch((e) => logger.error("[dispute notifications]", e.message));
    });
  } catch (err) {
    logger.error("verify-identity/dispute:", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
};

// ─── Set password (for Google users who verified school email) ────────────────
export const setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    const user = await User.findById(req.user._id);
    if (!user.schoolEmailVerified)
      return res.status(403).json({ message: "Verify your school email first to set a password." });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password set. You can now log in with your school email and this password." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Change password ──────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both fields are required" });
    if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters" });

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ── Saved Addresses ────────────────────────────────────────────────────────────
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses").lean();
    res.json({ addresses: user?.addresses || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const saveAddress = async (req, res) => {
  try {
    const { label, name, phone, address, city, state, isDefault } = req.body;
    // Route param ID (PUT /addresses/:id) takes priority over legacy body _id
    const addressId = req.params.id || null;

    if (!address?.trim() || !city?.trim()) {
      return res.status(400).json({ message: "Address and city are required" });
    }

    const user = await User.findById(req.user._id).select("addresses");

    if (addressId) {
      // Update existing by route param
      const addr = user.addresses.id(addressId);
      if (!addr) return res.status(404).json({ message: "Address not found" });
      Object.assign(addr, { label, name, phone, address, city, state });
      if (isDefault) user.addresses.forEach((a) => { a.isDefault = a._id.toString() === addressId; });
    } else {
      // Add new (POST /addresses)
      if (user.addresses.length >= 10) {
        return res.status(400).json({ message: "Maximum of 10 saved addresses allowed" });
      }
      if (isDefault) user.addresses.forEach((a) => { a.isDefault = false; });
      user.addresses.push({ label, name, phone, address, city, state, isDefault: !!isDefault });
    }

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: "Address not found" });
    addr.deleteOne();
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

