import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationPreferences,
  getNotificationPreferences,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/",              protect, getNotifications);
router.patch("/read-all",    protect, markAllNotificationsRead);
router.patch("/:id/read",    protect, markNotificationRead);
router.get("/preferences",   protect, getNotificationPreferences);
router.put("/preferences",   protect, updateNotificationPreferences);

export default router;

