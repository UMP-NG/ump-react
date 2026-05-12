import jwt from "jsonwebtoken";
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
    try {
      const user = await User.findById(decoded.id)
        .select("-password -wishlist -cart -orders -services -following")
        .lean();
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user;
    } catch (dbError) {
      return res.status(500).json({ message: "Database error" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
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
