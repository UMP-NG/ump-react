import Notification from "../models/Notification.js";
import User from "../models/User.js";

// ✅ Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "notificationPreferences"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ preferences: user.notificationPreferences || {} });
  } catch (err) {
    console.error("❌ Error loading notification preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { type, enabled } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Notification type is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.notificationPreferences = user.notificationPreferences || {};
    user.notificationPreferences[type] = enabled;

    await user.save();

    res.json({ message: "Notification preference updated successfully" });
  } catch (err) {
    console.error("❌ Error updating notification preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Fetch user notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifs = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ notifications: notifs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Mark notification as read
export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    await Notification.updateOne(
      { _id: id, user: userId },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
