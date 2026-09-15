import mongoose from "mongoose";

const broadcastSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, trim: true },
    body:     { type: String, required: true, trim: true },
    audience: { type: String, enum: ["all", "buyers", "sellers", "providers"], default: "all" },
    channels: {
      inapp: { type: Boolean, default: true },
      push:  { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    ctaLabel: String,
    ctaLink:  String,
    sendAt:   Date,
    expires:  Date,
    status:   { type: String, enum: ["draft", "scheduled", "sent"], default: "sent" },
    // Tracks the background email-delivery job (channels.email) durably —
    // recorded in the DB, not just held in an in-memory promise chain, so a
    // process restart/crash mid-send can be detected and resumed on next boot
    // instead of silently losing the rest of the audience's emails.
    // "partial" means some but not all of the intended audience was reached —
    // distinct from "sent" (everyone reached) so the admin UI never claims a
    // broadcast fully went out when it didn't. "sending" is a short-lived
    // in-flight lock: deliverBroadcastEmail() atomically claims a broadcast
    // out of "pending"/"partial" into "sending" before it starts, so two
    // concurrent resume attempts (e.g. two dynos booting around the same
    // rolling-deploy window) can't both re-mail the same audience.
    emailStatus: { type: String, enum: ["none", "pending", "sending", "sent", "partial", "failed"], default: "none" },
    // Every user successfully emailed so far — checked before (re)sending so a
    // resumed/retried delivery only targets whoever is still outstanding,
    // instead of re-mailing people who already got it.
    emailedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Heartbeat for the "sending" lock — refreshed after every chunk so a
    // genuinely long-running send isn't mistaken for an abandoned one. If a
    // process dies mid-send, this stops advancing and a later boot's
    // resumePendingBroadcastEmails() treats the lock as stale once it's old
    // enough, reclaiming the broadcast instead of leaving it stuck forever.
    emailSendingStartedAt: { type: Date, default: null },
    reach:    { type: Number, default: 0 },
    opens:    { type: Number, default: 0 },
    openRate: Number,
    sentAt:   Date,
    sentBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Broadcast", broadcastSchema);
