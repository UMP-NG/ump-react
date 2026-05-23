import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    reference: { type: String },
    method: { type: String, default: "bank" },
    accountDetails: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

payoutSchema.index({ status: 1, createdAt: -1 }); // pending payouts filter + agg

export default mongoose.model("Payout", payoutSchema);

