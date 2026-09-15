import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import cookie from "cookie";

// Cookie-based auth is only trusted for safe (read-only) requests. The
// frontend always sends the Authorization header itself (see utils/api.js),
// so this only ever matters for direct-link GETs (e.g. an invoice download
// opened in a new tab) or non-browser clients. Accepting the ambient cookie
// on state-changing requests would let a forged cross-site request ride it —
// there is no CSRF token anywhere in this app, so this is the actual defense.
const SAFE_METHODS = new Set(["GET", "HEAD"]);

export const protect = async (req, res, next) => {
  try {
    // ===== 1️⃣ Check Authorization header =====
    let token = req.header("Authorization")?.replace("Bearer ", "");

    // ===== 2️⃣ Check cookie if header missing (safe methods only — see above) =====
    if (!token && SAFE_METHODS.has(req.method) && req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie || "");
      token = cookies.token;
    }

    // ===== 3️⃣ No token found =====
    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    // ===== 4️⃣ Verify JWT =====
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }

    // ===== 5️⃣ Attach user to request =====
    // Only block if fully disconnected (state=0). state=2 means reconnecting — Mongoose buffers the query.
    if (mongoose.connection.readyState === 0) {
      console.warn(`⚠️  [protect] DB disconnected on ${req.method} ${req.path}`);
      return res.status(503).json({ message: "Service temporarily unavailable, please retry" });
    }
    try {
      const user = await User.findById(decoded.id)
        .select("-password -wishlist -cart -orders -services -following -otp -otpExpire -resetPasswordToken -resetPasswordExpire -schoolEmailOtp -schoolEmailOtpExpire -fcmToken")
        .maxTimeMS(8000)
        .lean();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.status === "banned") {
        return res.status(403).json({ message: "This account has been suspended." });
      }

      // Tokens issued before this field existed carry no "v" claim — treat
      // that as version 0, matching the schema default, so existing sessions
      // aren't logged out by this change. A password change bumps
      // tokenVersion, which invalidates every token still holding the old value.
      if ((decoded.v ?? 0) !== (user.tokenVersion || 0)) {
        return res.status(401).json({ message: "Session expired — please log in again." });
      }

      req.user = user;
    } catch (dbError) {
      const state = mongoose.connection.readyState; // 0=disconnected 1=connected 2=connecting
      console.error(`🔴 [protect] User lookup failed (DB state=${state}):`, dbError.name, "-", dbError.message);
      return res.status(state === 0 ? 503 : 500).json({
        message: state === 0 ? "Service temporarily unavailable, please retry" : "Database error",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// Sets req.user if a valid token is present; never rejects the request
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.user) return next();
    let token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token && SAFE_METHODS.has(req.method) && req.headers.cookie) {
      token = cookie.parse(req.headers.cookie || "").token;
    }
    if (!token) return next();
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return next(); }
    const user = await User.findById(decoded.id)
      .select("-password -wishlist -cart -orders -services -following -otp -otpExpire -resetPasswordToken -resetPasswordExpire -schoolEmailOtp -schoolEmailOtpExpire -fcmToken")
      .maxTimeMS(5000)
      .lean();
    if (user && user.status !== "banned" && (decoded.v ?? 0) === (user.tokenVersion || 0)) {
      req.user = user;
    }
  } catch { /* ignore */ }
  next();
};

// ✅ Role-based access control middleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || []; // roles is an array in User model
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res
        .status(403)
        .json({ message: "Access denied: insufficient role" });
    }

    next();
  };
};

