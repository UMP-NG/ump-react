import webpush from "web-push";
import mongoose from "mongoose";
import PushSub from "../models/PushSub.js";
import User from "../models/User.js";
import Broadcast from "../models/Broadcast.js";
import logger from "../utils/logger.js";

// In production, only use subscriptions that have a recorded origin AND
// are NOT from localhost — filters out stale dev subscriptions that
// would show "localhost" as the notification sender on the OS.
const _isProd = process.env.NODE_ENV === "production";
const PROD_SUB_FILTER = _isProd
  ? { origin: { $exists: true, $not: /localhost|127\.0\.0\.1|::1/ } }
  : {};

// Configure VAPID once at module load, not on every send
let _pushReady = false;
try {
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const mail = process.env.VAPID_EMAIL || "mailto:admin@myump.com.ng";
  if (pub && priv) {
    webpush.setVapidDetails(mail, pub, priv);
    _pushReady = true;
  }
} catch (err) {
  logger.error("VAPID config error:", err.message);
}

// GET /api/push/vapid-key  — public key the browser needs to subscribe
export const getVapidKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || null;
  res.json({ key });  // key === null means push not configured; browser checks before subscribing
};

// POST /api/push/subscribe
export const subscribe = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authenticated" });

    const { endpoint, keys } = req.body;
    if (
      !endpoint ||
      typeof keys?.p256dh !== "string" || !keys.p256dh.trim() ||
      typeof keys?.auth   !== "string" || !keys.auth.trim()
    ) return res.status(400).json({ message: "Invalid subscription object" });

    const user = await User.findById(req.user._id).select("roles").lean();
    const roles = user?.roles || ["user"];
    let origin = req.headers.origin || "";
    if (!origin && req.headers.referer) {
      try { origin = new URL(req.headers.referer).origin; } catch { origin = ""; }
    }

    // Upsert — same endpoint might re-subscribe after browser restart
    await PushSub.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys, roles, origin },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    logger.error("subscribe:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/push/test  — sends a real push to the requesting user's registered devices
export const sendTestPush = async (req, res) => {
  if (!_pushReady) return res.status(503).json({ message: "Push not configured on this server" });
  const subs = await PushSub.find({ user: req.user._id, ...PROD_SUB_FILTER });
  if (!subs.length) return res.status(404).json({ message: "No push subscription found for this device. Open the production site, grant notification permission, then try again." });
  const delivered = await sendPushToSubs(subs, {
    title: "UMP push test",
    body:  "Push notifications are working correctly.",
    url:   "/admin/broadcast",
    icon:  "/images/ump-icon.svg",
  });
  if (delivered === 0) {
    return res.status(502).json({ message: `Push subscription found but delivery failed for all ${subs.length} device(s). The subscription may be stale — try revoking and re-granting notification permission, then test again.` });
  }
  res.json({ success: true, devices: delivered });
};

// POST /api/push/open/:broadcastId  — called by service worker on notification click
export const trackOpen = async (req, res) => {
  try {
    const { broadcastId } = req.params;
    if (!mongoose.isValidObjectId(broadcastId)) return res.json({ success: false });

    const bc = await Broadcast.findOneAndUpdate(
      { _id: broadcastId, status: "sent" },   // only track real sent broadcasts
      { $inc: { opens: 1 } },
      { new: true, select: "opens reach" }
    );
    if (bc && bc.reach > 0) {
      bc.openRate = Math.round((bc.opens / bc.reach) * 100);
      await bc.save();
    }
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
};

// DELETE /api/push/cleanup-localhost — removes stale dev subscriptions for the current user
export const cleanupLocalhostSubs = async (req, res) => {
  try {
    const result = await PushSub.deleteMany({
      user: req.user._id,
      $or: [
        { origin: { $exists: false } },
        { origin: /localhost|127\.0\.0\.1|::1/ },
      ],
    });
    res.json({ success: true, removed: result.deletedCount });
  } catch (err) {
    logger.error("cleanupLocalhostSubs:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/push/unsubscribe
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await PushSub.deleteOne({ endpoint, user: req.user._id });
    else          await PushSub.deleteMany({ user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Send a web-push to every device a single user has subscribed from.
 * Called by notify() so every notification reaches the user even when offline.
 *
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, url?: string, icon?: string, tag?: string }} payload
 *   - title  — notification heading shown by the OS
 *   - body   — notification body text
 *   - url    — deep-link the user is taken to when they tap the notification
 *   - icon   — path to the notification icon (defaults to ump-icon.svg in the SW)
 *   - tag    — deduplication key; a new push with the same tag replaces a previous unread one
 */
export async function sendPushToUser(userId, payload) {
  if (!_pushReady) return;
  try {
    const subs = await PushSub.find({ user: userId, ...PROD_SUB_FILTER });
    if (subs.length) await sendPushToSubs(subs, payload);
  } catch (err) {
    logger.error("sendPushToUser:", err.message);
  }
}

/**
 * Send a web-push to a set of subscribers.
 * Called by createBroadcast. Returns the number of successful deliveries.
 *
 * @param {Array}  subs      — PushSub documents
 * @param {object} payload   — { title, body, url, icon }
 */
export async function sendPushToSubs(subs, payload) {
  if (!_pushReady || subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  let delivered = 0;
  const dead = [];   // endpoints that are gone (410 Gone)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          json,
          { TTL: 86400 }   // deliver for up to 24 hours even if device is offline
        );
        delivered++;
      } catch (err) {
        const code = err.statusCode;
        if (code === 410 || code === 404) {
          dead.push(sub.endpoint);   // subscription expired — remove it
        } else if (code === 401 || code === 403) {
          // VAPID key mismatch — subscription was created with a different key;
          // treat as dead so the browser re-subscribes on next login
          dead.push(sub.endpoint);
          logger.error(`Push VAPID auth error (${code}) for endpoint ${sub.endpoint.slice(-20)} — removing stale subscription`);
        } else {
          logger.error(`Push delivery error (${code ?? err.message}) for endpoint ${sub.endpoint.slice(-20)}`);
        }
      }
    })
  );

  if (dead.length) {
    await PushSub.deleteMany({ endpoint: { $in: dead } });
  }

  return delivered;
}
