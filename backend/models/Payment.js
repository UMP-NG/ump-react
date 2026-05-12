import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
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
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
    paidAt: Date,
    metadata: mongoose.Schema.Types.Mixed, // store provider response
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
