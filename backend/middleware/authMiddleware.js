import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import cookie from "cookie";

export const protect = async (req, res, next) => {
  try {
    // ✅ Skip if user already authenticated in this request
    if (req.user) {
      return next();
    }
    
    // ===== 1️⃣ Check Authorization header =====
    let token = req.header("Authorization")?.replace("Bearer ", "");

    // ===== 2️⃣ Check cookie if header missing =====
    if (!token && req.headers.cookie) {
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
        .select("-password -wishlist -cart -orders -services -following")
        .lean();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
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
    if (!token && req.headers.cookie) {
      token = cookie.parse(req.headers.cookie || "").token;
    }
    if (!token) return next();
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return next(); }
    const user = await User.findById(decoded.id).select("-password -wishlist -cart -orders -services -following").lean();
    if (user) req.user = user;
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

