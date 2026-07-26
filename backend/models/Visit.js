import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

visitSchema.index({ createdAt: -1 });
visitSchema.index({ visitorId: 1, createdAt: -1 });
// Retention: raw visit pings (anonymous visitorId + optional userId) are not kept
// indefinitely — auto-expire after ~13 months, comfortably past the 365-day admin
// reporting window.
visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export default mongoose.model("Visit", visitSchema);
