import mongoose from "mongoose";

const serviceSessionSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["completed", "pending", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ServiceSession", serviceSessionSchema);
