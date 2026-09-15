import Visit from "../models/Visit.js";
import logger from "../utils/logger.js";

// How often the frontend is expected to send a heartbeat while a tab is open
// and visible (see App.jsx). Each heartbeat adds exactly this many seconds —
// a fixed increment rather than measuring wall-clock gaps, so a delayed or
// dropped heartbeat only ever undercounts time-on-app, never inflates it.
const HEARTBEAT_INTERVAL_SECONDS = 30;
// Hard ceiling per session so a stuck tab (or a deliberately-replayed
// heartbeat) can't blow up the average used in reporting.
const MAX_SESSION_SECONDS = 4 * 60 * 60; // 4 hours

// Public, fire-and-forget style — records one site-visit ping per browser session.
// Never fails hard: a tracking hiccup should never affect the page load.
export const recordVisit = async (req, res) => {
  try {
    const { visitorId, sessionId } = req.body;
    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) {
      return res.status(204).end();
    }
    const safeSessionId = typeof sessionId === "string" && sessionId.length <= 100 ? sessionId : null;
    if (safeSessionId) {
      // Upsert keyed by sessionId — a tab that re-fires the initial visit ping
      // (React StrictMode double-effect, retry, etc.) must not create a second
      // Visit document for the same session; the unique partial index on
      // sessionId backs this, so a race lands on one winner either way.
      await Visit.findOneAndUpdate(
        { sessionId: safeSessionId },
        { $setOnInsert: { visitorId, userId: req.user?._id || null, sessionId: safeSessionId } },
        { upsert: true }
      );
    } else {
      await Visit.create({ visitorId, userId: req.user?._id || null, sessionId: null });
    }
    res.status(204).end();
  } catch (err) {
    logger.error("recordVisit:", err.message);
    res.status(204).end();
  }
};

// Public, fire-and-forget — extends the current session's tracked duration by
// one fixed interval. Sent periodically by the frontend while the tab is open
// and visible (paused via the Page Visibility API when backgrounded), so
// time-on-app reflects genuine, active use rather than an idle background tab.
export const recordHeartbeat = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
      return res.status(204).end();
    }
    await Visit.findOneAndUpdate(
      { sessionId, durationSeconds: { $lt: MAX_SESSION_SECONDS } },
      { $inc: { durationSeconds: HEARTBEAT_INTERVAL_SECONDS }, $set: { lastSeenAt: new Date() } }
    );
    res.status(204).end();
  } catch (err) {
    logger.error("recordHeartbeat:", err.message);
    res.status(204).end();
  }
};
