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
    method: { type: String },
    virtualAccount: mongoose.Schema.Types.Mixed,
    authorizationUrl: { type: String },  // stored so retries can replay the checkout URL
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Prevents two pending/processing Payment sessions from ever sharing an
// order — the existence check in initializeFlwPayment/initializePayment
// (find a pending Payment, create one if none exists) is a read-then-write
// race under a rapid double-submit; this index makes the actual DB write
// atomic regardless. Multikey unique index: MongoDB indexes each array
// element individually, so this rejects any insert whose "orders" array
// shares even one order with an existing reserved Payment's "orders" array.
// Covers "processing" as well as "pending" — the verify/webhook handlers
// flip status to "processing" while they call out to Flutterwave/Paystack;
// if the reservation were dropped at that exact moment, a second checkout
// attempt could slip in and create a duplicate payment for the same order(s)
// during that window.
paymentSchema.index(
  { orders: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "processing"] } } }
);

export default mongoose.model("Payment", paymentSchema);

