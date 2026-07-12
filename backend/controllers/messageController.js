import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { getIO } from "../utils/socket.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

// ---------- SEND MESSAGE ----------
export const sendMessage = async (req, res) => {
  try {
    const { receiver, text } = req.body;

    if (!receiver && !text && !req.files?.length) {
      return res
        .status(400)
        .json({ message: "Message or attachments required" });
    }
    if (text && text.length > 5000) {
      return res.status(400).json({ message: "Message too long (max 5000 characters)" });
    }

    const receiverUser = await User.findById(receiver);
    if (!receiverUser)
      return res.status(404).json({ message: "Receiver not found" });

    const senderRoles = req.user.roles || [];
    const receiverRoles = receiverUser.roles || [];

    // Example: basic messaging rule
    if (!senderRoles.some((r) => ["seller", "service_provider", "walker", "admin"].includes(r)) && !receiverRoles.some((r) => ["seller", "service_provider", "admin"].includes(r))) {
      return res.status(403).json({
        message: "Users can only message sellers or admins",
      });
    }

    // Build attachment URLs from Cloudinary if uploaded
    const attachments = (req.files || []).map((file) => ({
      url: file.path,
      publicId: file.filename
    }));

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      text: text || "",
      attachments,
      isAdminMessage: req.user.roles?.includes("admin") ?? false,
    });

    // Messages go only to whoever they're actually addressed to. The only
    // "randomness" in support messaging happens once, up front, when the
    // frontend assigns a new support thread to one specific admin (see
    // Messages.jsx) — after that it's a normal 1:1 conversation with that
    // admin. The shared support inbox (getUserMessages/getConversation)
    // already lets any admin see and reply to it if needed; this is just
    // about who gets the real-time ping for a given message.
    const io = getIO();
    if (io) {
      io.to(receiver.toString()).emit("new_message", message);
      io.to(req.user._id.toString()).emit("new_message", message);
    } else if (process.env.NODE_ENV !== "production") {
      logger.warn("⚠️  Socket.io unavailable — real-time delivery skipped for message", message._id);
    }

    // Push notification to receiver
    notify(receiver.toString(), {
      type: "message",
      title: `New message from ${req.user.name || "someone"}`,
      message: (text || "").slice(0, 100),
      link: "/messages",
    }).catch((err) => logger.warn("notify failed (HTTP send):", err.message));

    res.status(201).json({ success: true, message });
  } catch (error) {
    logger.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- PAGINATED MESSAGES ----------
export const getUserMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, conversationWith } = req.query;
    const skip = (page - 1) * limit;

    // Admins share a support inbox — an admin must be able to read messages between
    // any user and any other admin, not just themselves.
    let filter;
    if (req.user.roles?.includes("admin")) {
      const adminDocs = await User.find({ roles: "admin" }).select("_id").lean();
      const adminIds  = adminDocs.map((a) => a._id);
      filter = {
        $or: [
          { sender: conversationWith, receiver: { $in: adminIds } },
          { sender: { $in: adminIds }, receiver: conversationWith },
        ],
      };
    } else {
      filter = {
        $or: [
          { sender: req.user._id, receiver: conversationWith },
          { sender: conversationWith, receiver: req.user._id },
        ],
      };
    }

    const messages = await Message.find(filter)
      .populate("sender", "name avatar roles")
      .populate("receiver", "name avatar roles")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json(messages);
  } catch (error) {
    logger.error("Error fetching paginated messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- MARK MESSAGE READ ----------
export const markMessageRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    message.isRead = true;
    await message.save();

    res.json({ message: "Message marked as read", data: message });
  } catch (error) {
    logger.error("Error marking message read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- CONVERSATIONS ----------
export const getUserConversations = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId  = new mongoose.Types.ObjectId(req.user._id);
    const isAdmin = req.user.roles?.includes("admin");

    // Admins get a shared support inbox: they see every user→admin conversation,
    // not just their own, so any admin can pick up and reply to any support thread.
    // Admin↔admin private messages are excluded to preserve privacy.
    let baseMatch;
    if (isAdmin) {
      const adminDocs = await User.find({ roles: "admin" }).select("_id").lean();
      const adminIds  = adminDocs.map((a) => new mongoose.Types.ObjectId(a._id));
      baseMatch = {
        $or: [
          { sender: userId },   // messages this admin sent
          { receiver: userId }, // messages sent directly to this admin
          // user→any-admin support messages only (exclude admin↔admin private threads)
          { receiver: { $in: adminIds }, sender: { $nin: adminIds } },
        ],
      };
    } else {
      baseMatch = {
        $or: [
          { sender: userId },
          { receiver: userId },
        ],
      };
    }

    // OPTIMIZATION: Use simpler, faster aggregation pipeline
    const conversations = await Message.aggregate([
      {
        $match: baseMatch,
      },
      // Sort and limit BEFORE grouping - critical for performance
      { $sort: { createdAt: -1 } },
      { $limit: 500 }, // Limit to last 500 messages
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender",
            ],
          },
          latestMessage: { $first: "$text" },
          latestCreatedAt: { $first: "$createdAt" },
          isAdminLastMessage: { $first: "$isAdminMessage" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ["$sender", userId] },
                  { $eq: ["$isRead", false] }
                ]},
                1,
                0
              ]
            }
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                avatar: 1,
                roles: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          conversationWith: "$user._id",
          name: "$user.name",
          avatar: "$user.avatar",
          roles: "$user.roles",
          latestMessage: 1,
          latestCreatedAt: 1,
          isAdminLastMessage: 1,
          unreadCount: 1,
        },
      },
      { $sort: { latestCreatedAt: -1 } },
      { $limit: 100 },
    ]).allowDiskUse(true);

    res.json(conversations);
  } catch (error) {
    logger.error("❌ Error getting conversations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------- LATEST CONVERSATIONS ----------
export const getUserConversationsLatest = async (req, res) => {
  try {
    // Just use the optimized getUserConversations endpoint
    // This endpoint is no longer needed but kept for backwards compatibility
    return getUserConversations(req, res);
  } catch (error) {
    logger.error("Error fetching latest conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- UNREAD MESSAGES ----------
export const getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadMessages = await Message.find({
      receiver: userId,
      isRead: false,
    })
      .populate("sender", "name avatar")
      .select("-attachments")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(unreadMessages);
  } catch (error) {
    logger.error("Error fetching unread messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- MARK CONVERSATION READ ----------
export const markConversationRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationWithId } = req.params;

    await Message.updateMany(
      {
        sender: conversationWithId,
        receiver: userId,
        readBy: { $ne: userId },
      },
      { $push: { readBy: userId }, $set: { isRead: true } }
    );

    res.json({ message: "Conversation marked as read" });
  } catch (error) {
    logger.error("Error marking conversation read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- UNREAD COUNTS ----------
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;

    const counts = await Message.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(userId),
          readBy: { $ne: userId },
        },
      },
      {
        $group: {
          _id: "$sender",
          unreadCount: { $sum: 1 },
        },
      },
      {
        $limit: 100,
      },
    ]);

    res.json(counts);
  } catch (error) {
    logger.error("Error getting unread counts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- UNREAD COUNT (LIGHTWEIGHT) ----------
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const count = await Message.countDocuments({
      receiver: userId,
      isRead: false,
    });

    res.json({ count });
  } catch (error) {
    logger.error("Error getting unread count:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------- SINGLE MESSAGE ----------
export const getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId)
      .populate("sender", "name avatar role")
      .populate("receiver", "name avatar roles");

    if (!message) return res.status(404).json({ message: "Message not found" });

    if (
      message.sender._id.toString() !== req.user._id.toString() &&
      message.receiver._id.toString() !== req.user._id.toString() &&
      !req.user.roles?.includes("admin")
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(message);
  } catch (error) {
    logger.error("Error fetching message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

