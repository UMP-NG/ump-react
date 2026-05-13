import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
  variant: {
    sku: String,
    attributes: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ["processing", "shipped", "delivered", "completed", "cancelled"],
    default: "processing",
  },
  trackingNumber: String,
});

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "completed", "cancelled"],
      default: "pending",
    },

    items: [orderItemSchema],

    totalAmount: { type: Number, required: true, min: [0, "Total amount cannot be negative"] },
    subtotal:    { type: Number, default: 0,     min: [0, "Subtotal cannot be negative"] },
    tax:         { type: Number, default: 0,     min: 0 },
    deliveryFee: { type: Number, default: 0,     min: [0, "Delivery fee cannot be negative"] },

    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "Nigeria" },
    },

    paymentMethod: {
      type: String,
      enum: ["Paystack", "Flutterwave", "Stripe", "PayPal", "COD", "transfer"],
      default: "Paystack",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "released"],
      default: "pending",
    },

    paymentInfo: {
      reference: String,
      transactionId: String,
      paidAt: Date,
    },

    notes: String,
    refund: {
      amount: { type: Number, default: 0 },
      reason: String,
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected"],
        default: "none",
      },
      initiatedAt: Date,
    },
    deliveryCode: { type: String },
    deliveryCodeUsed: { type: Boolean, default: false },
    escrowReleasedAt: Date,
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

