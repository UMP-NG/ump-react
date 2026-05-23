import Notification from "../models/Notification.js";
import { getIO } from "./socket.js";

/**
 * Persist a notification to MongoDB and push it to the recipient in real time
 * via Socket.io if they are currently connected.
 *
 * Fire-and-forget — never throws so it never breaks the main request flow.
 *
 * @param {string|ObjectId} userId
 * @param {{ type, title, message, link }} payload
 */
export async function notify(userId, { type = "system", title, message, link } = {}) {
  try {
    const notif = await Notification.create({ user: userId, type, title, message, link });

    // Real-time delivery — works if the user is online (socket room = userId string)
    const io = getIO();
    if (io) {
      io.to(userId.toString()).emit("new_notification", {
        _id:       notif._id,
        type:      notif.type,
        title:     notif.title,
        message:   notif.message,
        link:      notif.link,
        read:      false,
        createdAt: notif.createdAt,
      });
    }
  } catch (err) {
    console.error("notify() failed:", err.message);
  }
}
