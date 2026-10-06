import express from "express";
import {
  getCurrentUserProfile,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  getUserById,
  addToWishlist,
  removeFromWishlist,
  addToCart,
  updateCartItem,
  removeFromCart,
  markNotificationRead,
  becomeServiceProvider,
} from "../controllers/userController.js";
import { becomeSeller } from "../controllers/sellerController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadSellerMedia, uploadAvatar } from "../middleware/upload.js";

const router = express.Router();

// ===============================
// Current logged-in user routes
// ===============================
router.get("/me", protect, getCurrentUserProfile); // Get own profile
router.put("/me", protect, updateUserProfile); // Update own profile
router.delete("/me", protect, deleteUser); // Delete own account

// Wishlist
router.post("/me/wishlist/:productId", protect, addToWishlist);
router.delete("/me/wishlist/:productId", protect, removeFromWishlist);

// Cart
router.post("/me/cart/:productId", protect, addToCart);
router.put("/me/cart/:productId", protect, updateCartItem); // e.g., change quantity
router.delete("/me/cart/:productId", protect, removeFromCart);

// Follow/Unfollow users — see routes/followRoutes.js (POST /api/follows/:userId)
// for the real, working implementation. A duplicate pair used to live here
// but read the wrong req.params key and always 404'd — removed as dead code.

// Notifications
router.put(
  "/me/notifications/:notificationId/read",
  protect,
  markNotificationRead
);

router.post(
  "/become/seller",
  protect,
  (req, res, next) => {
    console.log(`\n📋 [ROUTE] POST /become/seller initiated`);
    next();
  },
  uploadSellerMedia,
  (req, res, next) => {
    console.log(`✅ [ROUTE] uploadSellerMedia completed`);
    next();
  },
  becomeSeller
);

router.post(
  "/become/service_provider",
  protect,
  uploadAvatar,
  becomeServiceProvider
);

// ===============================
// Admin-only routes
// ===============================
router.get("/", protect, requireRole("admin"), getAllUsers);
router.get("/:id", protect, requireRole("admin"), getUserById);

export default router;

