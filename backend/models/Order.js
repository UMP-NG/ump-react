import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
  // What the SELLER is owed for this item — normally equal to `price`. When
  // `price` reflects an admin-created store Promotion rather than a sale the
  // seller set themselves, this holds the product's full, undiscounted price
  // instead: the discount was the platform's call, not the seller's, so the
  // platform (not the seller) absorbs the gap. See utils/pricing.js's
  // payoutPrice(). Falls back to `price` when absent (pre-existing orders).
  sellerPayoutPrice: { type: Number, min: [0, "Seller payout price cannot be negative"] },
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
      enum: ["pending", "pending-verification", "confirmed", "shipped", "ready_for_pickup", "partial", "completed", "cancelled", "disputed"],
      default: "pending",
    },

    items: [orderItemSchema],

    totalAmount:   { type: Number, required: true, min: [0, "Total amount cannot be negative"] },
    subtotal:      { type: Number, default: 0,    min: [0, "Subtotal cannot be negative"] },
    serviceCharge: { type: Number, default: 0,    min: [0, "Service charge cannot be negative"] },
    tax:           { type: Number, default: 0,    min: [0, "Tax cannot be negative"] },
    deliveryFee:   { type: Number, default: 0,    min: [0, "Delivery fee cannot be negative"] },

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
    deliveryMethod: {
      type: String,
      enum: ["pickup", "delivery"],
      default: "pickup",
    },
    shipbubble: {
      serviceCode:    { type: String, default: null },
      shipmentId:     { type: String, default: null },
      trackingNumber: { type: String, default: null },
      trackingUrl:    { type: String, default: null },
      courierName:    { type: String, default: null },
      status:         { type: String, default: null },
    },

    paymentProof: { type: String },
    deliveryCode: { type: String },
    deliveryCodeUsed: { type: Boolean, default: false },
    creditUsed:     { type: Number, default: 0, min: 0 }, // referral credit applied at checkout
    couponDiscount: { type: Number, default: 0, min: 0 }, // coupon discount applied at checkout
    couponId:       { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
    escrowReleasedAt: Date,
    isReviewed: { type: Boolean, default: false },

    // Dispute fields — stored directly on the order (no separate collection)
    disputeReason:      { type: String },
    disputeDescription: { type: String },
    disputeOutcome:     { type: String },
    disputeNote:        { type: String },
    disputeResolvedAt:  { type: Date },
    disputeResolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });   // status filter + recent-first sort
orderSchema.index({ buyer: 1, createdAt: -1 });    // buyer order history
orderSchema.index({ seller: 1, createdAt: -1 });   // seller order history + revenue agg
orderSchema.index({ createdAt: -1 });              // dashboard recent orders + chart agg

export default mongoose.model("Order", orderSchema);

