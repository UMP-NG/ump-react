import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    refModel: {
      type: String,
      required: true,
      enum: ["Product", "Listing", "Service"], // all models that can be reviewed
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "refModel", // 🔥 dynamic reference
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },

    sellerReply:     { type: String, trim: true, default: null },
    sellerRepliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Enforces "one review per user per item" atomically at the DB level —
// the controller's findOne-then-create check alone is a TOCTOU race.
reviewSchema.index({ refModel: 1, refId: 1, author: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);

