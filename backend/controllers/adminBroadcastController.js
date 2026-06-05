import Broadcast from "../models/Broadcast.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import PushSub from "../models/PushSub.js";
import { sendPushToSubs } from "./pushController.js";
import { getIO } from "../utils/socket.js";
import logger from "../utils/logger.js";

export const getBroadcasts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ broadcasts });
  } catch (err) {
    logger.error("getBroadcasts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteBroadcast = async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.broadcastId);
    res.json({ success: true });
  } catch (err) {
    logger.error("deleteBroadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createBroadcast = async (req, res) => {
  try {
    const { title, body, audience, channels, ctaLabel, ctaLink, sendAt, expires } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body are required" });
    const ch          = channels || { inapp: true, push: true, email: false };
    const isScheduled = sendAt && new Date(sendAt) > new Date();
    const broadcast   = await Broadcast.create({
      title: title.trim(), body: body.trim(), audience: audience || "all", channels: ch,
      ctaLabel, ctaLink, sendAt: sendAt || null, expires: expires || null,
      status: isScheduled ? "scheduled" : "sent", sentAt: isScheduled ? null : new Date(), sentBy: req.user._id,
    });
    if (isScheduled) return res.status(201).json({ success: true, broadcast });

    const roleFilter =
      audience === "sellers"   ? { roles: "seller" } :
      audience === "buyers"    ? { roles: "user" }   :
      audience === "providers" ? { roles: "service_provider" } : {};
    let reach = 0;

    if (ch.inapp) {
      const users     = await User.find(roleFilter).select("_id").lean();
      const notifDocs = users.map((u) => ({ user: u._id, type: "system", title: title.trim(), message: body.trim(), link: ctaLink || "" }));
      if (notifDocs.length) {
        await Notification.insertMany(notifDocs, { ordered: false });
        reach = Math.max(reach, users.length);
        const io = getIO();
        if (io) {
          const payload = { type: "system", title: title.trim(), message: body.trim(), link: ctaLink || "", read: false, createdAt: new Date() };
          users.forEach((u) => io.to(u._id.toString()).emit("new_notification", payload));
        }
      }
    }

    if (ch.push) {
      const audienceRole =
        audience === "sellers"   ? "seller" :
        audience === "buyers"    ? "user"   :
        audience === "providers" ? "service_provider" : null;
      const prodSubFilter = process.env.NODE_ENV === "production"
        ? { origin: { $exists: true, $not: /localhost|127\.0\.0\.1|::1/ } } : {};
      const pushFilter = audienceRole ? { roles: audienceRole, ...prodSubFilter } : { ...prodSubFilter };
      const subs       = await PushSub.find(pushFilter).lean();
      const pushed     = await sendPushToSubs(subs, {
        title: title.trim(), body: body.trim(), icon: "/images/ump-icon.svg",
        badge: "/images/ump-logo.png", url: ctaLink || "/", tag: broadcast._id.toString(),
      });
      reach = Math.max(reach, pushed);
    }

    await Broadcast.findByIdAndUpdate(broadcast._id, { reach });
    res.status(201).json({ success: true, broadcast: { ...broadcast.toObject(), reach } });
  } catch (err) {
    logger.error("createBroadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};
