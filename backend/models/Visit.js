import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // One tab session — set once at the initial visit ping, then referenced by
    // periodic heartbeat pings so time-on-app can be tracked without creating
    // a new document per heartbeat. Older visits (pre-heartbeat) have none.
    sessionId: { type: String, default: null },
    lastSeenAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

visitSchema.index({ createdAt: -1 });
visitSchema.index({ visitorId: 1, createdAt: -1 });
// One document per tab session — partial so the many pre-heartbeat visits
// with sessionId: null aren't constrained by uniqueness.
visitSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "string" } } }
);
// Retention: raw visit pings (anonymous visitorId + optional userId) are not kept
// indefinitely — auto-expire after ~5 years, matching the longest reporting
// window admins can query (VALID_DAYS includes 1825 in adminStatsController.js).
// Expiring sooner would silently make that 5-year option under-report.
visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 1825 });

export default mongoose.model("Visit", visitSchema);
