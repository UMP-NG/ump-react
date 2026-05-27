import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: ["Paystack", "Flutterwave", "Stripe", "PayPal"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    reference: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed", "refunded"],
      default: "pending",
    },
    paidAt: Date,
    metadata: mongoose.Schema.Types.Mixed, // store provider response
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

