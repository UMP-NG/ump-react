import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadAvatar } from "../middleware/upload.js";
import {
  getSellerDashboard,
  updateSellerSettings,
  updateNotificationPreferences,
  updateSellerPolicies,
  deactivateAccount,
} from "../controllers/sellerAnalyticsController.js";
import { getSellerOrders } from "../controllers/orderController.js";
import { changePassword } from "../controllers/authController.js";

const router = express.Router();

// ✅ Routes

router.get("/", protect, requireRole("seller"), getSellerDashboard);
router.put(
  "/sellers/settings",
  protect,
  requireRole("seller"),
  uploadAvatar,
  updateSellerSettings
);
router.put(
  "/notifications/preferences",
  protect,
  requireRole("seller"),
  updateNotificationPreferences
);
router.put(
  "/sellers/policies",
  protect,
  requireRole("seller"),
  updateSellerPolicies
);
// Delegates to the canonical change-password flow (authController.changePassword)
// — correctly single-hashes the new password and bumps tokenVersion to
// invalidate any other existing session, unlike the old duplicate handler
// this used to call.
router.put("/users/update-password", protect, changePassword);
router.delete("/users/deactivate", protect, deactivateAccount);
router.get("/orders", protect, requireRole("seller"), getSellerOrders);
export default router;

