import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationRead,
  updateNotificationPreferences,
  getNotificationPreferences,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/preferences", protect, getNotificationPreferences);
router.put("/preferences", protect, updateNotificationPreferences);
router.patch("/:id/read", protect, markNotificationRead);

export default router;
