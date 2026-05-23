import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:    { type: String, enum: ["order", "message", "payout", "review", "booking", "dispute", "system"], default: "system" },
    title:   { type: String, default: "" },
    message: { type: String, default: "" },
    link:    { type: String, default: "" },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
