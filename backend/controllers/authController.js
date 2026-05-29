import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendMail from "../utils/sendMail.js";
import generateToken from "../utils/generateToken.js";
import Service from "../models/Service.js";
import { audit } from "../utils/auditLog.js";

// ===============================
// SIGNUP WITH OTP
// ===============================
const UNILAG_EMAIL = /^[1-9]\d{7,}@live\.unilag\.edu\.ng$/i;

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

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
    console.log("🔐 [SIGNUP] Request received:", { email: maskedEmail, name, passwordLength: password?.length });

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      console.log("⚠️  [SIGNUP] User already exists and verified:", maskedEmail);
      return res.status(400).json({ message: "User already exists" });
    }

    let user;
    if (existingUser && !existingUser.isVerified) {
      // Resend OTP for unverified user — also update name and password so
      // re-signup heals accounts that were created with the old double-hash bug
      console.log("🔄 [SIGNUP] User exists but not verified, resending OTP:", maskedEmail);
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
        console.log("📧 [SIGNUP] OTP sent to existing unverified user:", maskedEmail);
      } catch (err) {
        console.error("❌ [SIGNUP] Error sending OTP:", err.message);
        // Error logged at mail service level
      }

      return res.status(200).json({
        message: "OTP sent successfully",
        ...(process.env.NODE_ENV !== "production" && { otp }),
      });
    }

    // Create new unverified user — pre-save hook handles hashing
    user = new User({
      name: name || undefined,
      email,
      password,
      isVerified: false,
    });

    const otp = user.createOTP();
    await user.save();
    console.log("✅ [SIGNUP] New user created:", email);

    try {
      await sendMail({
        email: email,
        subject: "Your OTP Code",
        type: "otp",
        otp: otp,
      });
      console.log("📧 [SIGNUP] OTP sent to new user:", maskedEmail);
    } catch (err) {
      console.error("❌ [SIGNUP] Error sending OTP to new user:", err.message);
      // Error logged at mail service level
    }

    res.status(201).json({
      message: "User created. OTP sent to your email.",
      ...(process.env.NODE_ENV !== "production" && { otp }),
    });
  } catch (error) {
    console.error("❌ [SIGNUP] Server error:", error.message);
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

    // Fix #5: return only safe fields, not the full Mongoose document
    res.status(201).json({
      message: "Provider account created",
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
    console.error("❌ [SIGNUP_PROVIDER] Server error:", error.message);
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

    // Fix #9: check expiry first, then use constant-time comparison to prevent timing attacks
    if (!user.otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    const otpBuf = Buffer.from(String(user.otp));
    const inBuf  = Buffer.from(String(otp));
    const otpMatch = otpBuf.length === inBuf.length && crypto.timingSafeEqual(otpBuf, inBuf);
    if (!otpMatch) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Issue auth cookie so the user is immediately logged in
    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Fix #3: do not return the raw token in the body — the httpOnly cookie is enough.
    // Returning the token in JSON exposes it to JavaScript and defeats the cookie's security.
    res.status(200).json({
      message: "Email verified successfully",
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

    const existingUser = await User.findOne({ email });
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
// PROTECT MIDDLEWARE
// ===============================
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized" });
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
      fcmToken:                 u.fcmToken ? true : undefined, // presence only, not the actual token
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

    res.status(200).json({
      message: "Password reset link generated",
      resetUrl,
    });
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
    if (!user) return res.status(404).json({ message: "No account found with that email" });
    if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });

    const otp = user.createOTP();
    await user.save({ validateBeforeSave: false });

    try {
      await sendMail({ email, type: "otp", otp });
    } catch (mailErr) {
      console.error("❌ [RESEND-OTP] Email delivery failed:", mailErr.message);
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

