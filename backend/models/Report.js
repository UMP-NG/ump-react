import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    refModel: {
      type: String,
      required: true,
      enum: ["Product", "Listing", "Service", "Seller", "User"],
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "refModel",
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "Counterfeit / Fake item",
        "Prohibited or illegal item",
        "Misleading description or photos",
        "Spam or duplicate listing",
        "Inappropriate content",
        "Price gouging / Scam",
        "Fraudulent seller / account",
        "Harassment",
        "Other",
      ],
    },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["open", "reviewed", "dismissed", "removed"],
      default: "open",
    },
    resolution: { type: String, trim: true },
    resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt:  { type: Date },
  },
  { timestamps: true }
);

// Enforce deduplication at DB level — only one open report per user per item
reportSchema.index(
  { refModel: 1, refId: 1, reporter: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
