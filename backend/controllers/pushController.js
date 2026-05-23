import webpush from "web-push";
import PushSub from "../models/PushSub.js";
import User from "../models/User.js";

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
  console.error("VAPID config error:", err.message);
}

// GET /api/push/vapid-key  — public key the browser needs to subscribe
export const getVapidKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || null;
  res.json({ key });  // key === null means push not configured; browser checks before subscribing
};

// POST /api/push/subscribe
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (
      !endpoint ||
      typeof keys?.p256dh !== "string" || !keys.p256dh.trim() ||
      typeof keys?.auth   !== "string" || !keys.auth.trim()
    ) return res.status(400).json({ message: "Invalid subscription object" });

    const user = await User.findById(req.user._id).select("roles").lean();
    const roles = user?.roles || ["user"];

    // Upsert — same endpoint might re-subscribe after browser restart
    await PushSub.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys, roles },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("subscribe:", err);
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
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint);   // subscription expired — remove it
        }
        // Other errors (502 etc.) are transient — don't remove
      }
    })
  );

  if (dead.length) {
    await PushSub.deleteMany({ endpoint: { $in: dead } });
  }

  return delivered;
}
