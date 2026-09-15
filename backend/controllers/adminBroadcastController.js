import Broadcast from "../models/Broadcast.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import PushSub from "../models/PushSub.js";
import { sendPushToSubs } from "./pushController.js";
import { getIO } from "../utils/socket.js";
import logger from "../utils/logger.js";
import sendMail from "../utils/sendMail.js";

// Cap concurrent SMTP/API connections so a large audience doesn't flood
// the mail provider or the Zoho SMTP fallback.
const EMAIL_CHUNK_SIZE = 20;

// How old a "sending" lock has to be before a new boot treats it as
// abandoned (the process that held it died mid-send) rather than possibly
// still legitimately in flight elsewhere. The lock's timestamp is refreshed
// every chunk, so any genuinely alive sender stays well under this.
const SENDING_STALE_MS = 10 * 60 * 1000;

function roleFilterFor(audience) {
  return audience === "sellers"   ? { roles: "seller" }
    :    audience === "buyers"    ? { roles: "user" }
    :    audience === "providers" ? { roles: "service_provider" }
    :    {};
}

// Sends one chunk and returns the ids of users actually mailed (skipping
// failures) so the caller can persist progress incrementally instead of only
// at the very end.
async function sendEmailBatch(batch, { subject, message, ctaLabel, ctaLink }) {
  const fullMessage = ctaLink ? `${message}\n\n${ctaLabel || "View"}: ${ctaLink}` : message;
  const results = await Promise.allSettled(
    batch.map((u) => sendMail({ email: u.email, subject, message: fullMessage }))
  );
  const mailedIds = [];
  results.forEach((r, idx) => {
    if (r.status === "fulfilled" && !r.value?.skipped) mailedIds.push(batch[idx]._id);
    else if (r.status === "rejected") logger.error("Broadcast email failed:", r.reason?.message);
  });
  return mailedIds;
}

// Delivers (or resumes) a broadcast's email channel. `emailStatus` is the
// durable marker: createBroadcast sets it to "pending" synchronously, in the
// same DB write as the initial reach update, *before* responding — so even
// if the process crashes right after responding (or mid-send), the pending
// state survives in the DB and resumePendingBroadcastEmails() can pick it
// back up on next boot, instead of the audience silently never getting mailed.
//
// Progress is persisted per chunk via `emailedUserIds`, and a resume only
// targets users not already in that list — so a crash/restart mid-send
// doesn't re-mail everyone, only whoever is still outstanding. Final status
// is "sent" only if the whole audience was reached, "partial" if some but
// not all were, and "failed" only if none were — an admin looking at the
// broadcast list should never see "sent" for a delivery that didn't finish.
//
// The function is only ever safe to run once at a time per broadcast — two
// concurrent calls (e.g. a rolling deploy briefly running two instances that
// both resume at boot) would otherwise both read the same "not yet emailed"
// list and double-mail every recipient. `findOneAndUpdate` atomically claims
// the broadcast into "sending" first; a second caller's claim query then
// matches nothing and returns immediately instead of proceeding.
async function deliverBroadcastEmail(broadcastId) {
  // Claimable if freshly pending/partial, OR if it's "sending" but the lock's
  // heartbeat is stale — same staleness rule resumePendingBroadcastEmails()
  // uses to decide what's worth resuming in the first place, so the two never
  // disagree about whether a given "sending" broadcast is actually claimable.
  const claimed = await Broadcast.findOneAndUpdate(
    {
      _id: broadcastId,
      $or: [
        { emailStatus: { $in: ["pending", "partial"] } },
        { emailStatus: "sending", emailSendingStartedAt: { $lt: new Date(Date.now() - SENDING_STALE_MS) } },
      ],
    },
    { $set: { emailStatus: "sending", emailSendingStartedAt: new Date() } },
    { new: true }
  ).lean();
  if (!claimed) return;

  const alreadyEmailed = claimed.emailedUserIds || [];
  let mailedTotal = alreadyEmailed.length;
  let sendErrored = false;

  try {
    const users = await User.find({
      ...roleFilterFor(claimed.audience),
      _id: { $nin: alreadyEmailed },
    }).select("_id email").lean();
    const totalAudience = alreadyEmailed.length + users.length;

    for (let i = 0; i < users.length; i += EMAIL_CHUNK_SIZE) {
      const batch = users.slice(i, i + EMAIL_CHUNK_SIZE);
      const mailedIds = await sendEmailBatch(batch, {
        subject: claimed.title, message: claimed.body, ctaLabel: claimed.ctaLabel, ctaLink: claimed.ctaLink,
      });
      if (mailedIds.length) {
        mailedTotal += mailedIds.length;
        await Broadcast.findByIdAndUpdate(broadcastId, {
          $addToSet: { emailedUserIds: { $each: mailedIds } },
          $max: { reach: mailedTotal },
          // Refresh the lock's heartbeat so a long-running send of a large
          // audience is never mistaken for a stale/abandoned one.
          $set: { emailSendingStartedAt: new Date() },
        });
      }
    }

    const finalStatus = mailedTotal === 0 ? "failed" : mailedTotal >= totalAudience ? "sent" : "partial";
    await Broadcast.findByIdAndUpdate(broadcastId, { emailStatus: finalStatus });
  } catch (err) {
    sendErrored = true;
    logger.error(`deliverBroadcastEmail failed for broadcast ${broadcastId}:`, err);
    await Broadcast.findByIdAndUpdate(broadcastId, { emailStatus: mailedTotal > 0 ? "partial" : "failed" }).catch(() => {});
  }
  return !sendErrored;
}

// Called once at server startup (see server.js) — resumes any broadcast whose
// email delivery was interrupted by a crash/restart while still "pending" or
// left "partial" from an earlier failed attempt. Also reclaims a "sending"
// broadcast once its heartbeat is old enough to be considered abandoned —
// otherwise a broadcast whose sender process crashed mid-send (rather than
// erroring cleanly) would stay claimed forever and never actually resume.
export async function resumePendingBroadcastEmails() {
  const pending = await Broadcast.find({
    $or: [
      { emailStatus: { $in: ["pending", "partial"] } },
      { emailStatus: "sending", emailSendingStartedAt: { $lt: new Date(Date.now() - SENDING_STALE_MS) } },
    ],
  }).select("_id").lean();
  for (const { _id } of pending) {
    logger.info(`[broadcast] Resuming interrupted email delivery for broadcast ${_id}`);
    await deliverBroadcastEmail(_id);
  }
  return pending.length;
}

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
    const deleted = await Broadcast.findByIdAndDelete(req.params.broadcastId);
    if (!deleted) return res.status(404).json({ message: "Broadcast not found" });
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

    const roleFilter = roleFilterFor(audience);
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

    // Mark the email channel "pending" durably, in the same write as the
    // reach update, BEFORE responding — this is the record that survives a
    // crash and lets resumePendingBroadcastEmails() pick delivery back up.
    const updated = await Broadcast.findByIdAndUpdate(
      broadcast._id,
      { reach, emailStatus: ch.email ? "pending" : "none" },
      { new: true }
    ).lean();
    res.status(201).json({ success: true, broadcast: updated });

    // Email can take minutes for a large audience (chunked SMTP/API calls) —
    // send it after the response so the admin's request never hangs waiting
    // on mail delivery.
    if (ch.email) {
      deliverBroadcastEmail(broadcast._id).catch((err) => logger.error("createBroadcast background email send failed:", err));
    }
  } catch (err) {
    logger.error("createBroadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};
