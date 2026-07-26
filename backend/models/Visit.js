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

export default mongoose.model("Visit", visitSchema);
