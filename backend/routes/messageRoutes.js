import express from "express";
import {
  sendMessage,
  getUserMessages,
  markMessageRead,
  getUserConversations,
  getUserConversationsLatest,
  markConversationRead,
  getUnreadCounts,
  getUnreadCount,
  getMessageById,
  getUnreadMessages,
} from "../controllers/messageController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadAttachments } from "../middleware/upload.js";

const router = express.Router();

// ---------- 🔹 Define all allowed roles ----------
const ALL_CHAT_ROLES = [
  "user",
  "seller",
  "service_provider",
  "admin",
];

// ---------- 🔹 Routes ----------
router.post(
  "/send",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  uploadAttachments,
  sendMessage
);

router.get("/user", protect, requireRole(...ALL_CHAT_ROLES), getUserMessages);
router.get(
  "/conversations",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getUserConversations
);
router.get(
  "/latest",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getUserConversationsLatest
);
router.get(
  "/unread-counts",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getUnreadCounts
);
router.get(
  "/unread-count",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getUnreadCount
);
router.get(
  "/unread",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getUnreadMessages
);
router.get(
  "/:messageId",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  getMessageById
);
router.put(
  "/:messageId/read",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  markMessageRead
);
router.put(
  "/conversation/:conversationWithId/read",
  protect,
  requireRole(...ALL_CHAT_ROLES),
  markConversationRead
);

export default router;
