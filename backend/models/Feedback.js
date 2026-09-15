import mongoose from "mongoose";

// Demand-signal feedback — captured when a browsing user can't find what they
// want, so admins can see unmet demand and decide what to source/add.
const feedbackSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 500 },
    reason:  { type: String, trim: true, maxlength: 60 },
    context: { type: String, trim: true, maxlength: 30, default: "market" }, // page it was submitted from
    searchQuery: { type: String, trim: true, maxlength: 200 },
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["new", "reviewed"], default: "new" },
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
