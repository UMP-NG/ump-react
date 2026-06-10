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

export default mongoose.model("Review", reviewSchema);

