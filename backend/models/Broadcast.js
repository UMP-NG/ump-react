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
    reach:    { type: Number, default: 0 },
    openRate: Number,
    sentAt:   Date,
    sentBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Broadcast", broadcastSchema);
