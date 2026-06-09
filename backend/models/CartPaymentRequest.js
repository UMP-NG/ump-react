import mongoose from "mongoose";

const cartPaymentRequestSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerName:  { type: String, default: "" },
    ownerEmail: { type: String, default: "" },
    // Snapshot of cart items at time of link generation
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        sellerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name:      String,
        price:     Number,
        quantity:  Number,
        image:     String,
      },
    ],
    subtotal:      { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    total:         { type: Number, default: 0 },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    flwTxRef:    { type: String },
    expiresAt:   { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("CartPaymentRequest", cartPaymentRequestSchema);
