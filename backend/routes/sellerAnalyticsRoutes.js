import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadAvatar } from "../middleware/upload.js";
import {
  getSellerDashboard,
  updateSellerSettings,
  updateNotificationPreferences,
  updateSellerPolicies,
  updatePassword,
  deactivateAccount,
} from "../controllers/sellerAnalyticsController.js";
import { getSellerOrders } from "../controllers/orderController.js";

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
router.put("/users/update-password", protect, updatePassword);
router.delete("/users/deactivate", protect, deactivateAccount);
router.get("/orders", protect, requireRole("seller"), getSellerOrders);
export default router;

