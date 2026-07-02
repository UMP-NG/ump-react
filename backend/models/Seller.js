import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    storeName: { type: String, trim: true },
    businessName: { type: String, trim: true },
    bio: String,
    banner: {
      url: String,
      publicId: String,
    },
    logo: {
      url: String,
      publicId: String,
    },
    avatar: {
      url: String,
      publicId: String,
    },

    sold: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    category: [String],

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followersCount: { type: Number, default: 0 },
    story: String,
    description: { type: String, trim: true },
    location: { type: String, trim: true },

    // ✅ Temporary open/close toggle (vacation mode) — store stays intact,
    // products are shown as unavailable and purchases are blocked while closed.
    isOpen: { type: Boolean, default: true },

    // ✅ Store Verification (school-mail auth — do NOT use for badge display)
    isVerified: { type: Boolean, default: false },
    verificationRequested: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },

    // ✅ Paid subscription — controls the crown badge on store/product pages
    isSubscribed:          { type: Boolean, default: false },
    subscriptionRequested: { type: Boolean, default: false },
    subscriptionPlan:      { type: String, enum: ["monthly", "annual"], default: null },
    subscriptionExpiresAt: { type: Date, default: null },

    // ✅ Relationship with products
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    // ✅ Analytics
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    address: { type: String, trim: true },

    // ✅ Delivery configuration
    // deliveryConfigured is set to true only when the seller explicitly saves their
    // delivery settings. pickup.enabled defaults to true but that alone does NOT mean
    // the seller has consciously chosen a delivery method — hence the separate flag.
    deliveryConfigured: { type: Boolean, default: false },
    delivery: {
      pickup: {
        enabled:      { type: Boolean, default: true },
        instructions: { type: String, default: "" },
      },
      selfDelivery: {
        enabled:       { type: Boolean, default: false },
        fee:           { type: Number, default: 0, min: 0 },
        coverage:      { type: String, default: "" },
        estimatedDays: { type: String, default: "1–3 days" },
      },
      shipbubble: {
        enabled: { type: Boolean, default: false },
        pickupAddress: {
          name:   { type: String, default: "" },
          phone:  { type: String, default: "" },
          email:  { type: String, default: "" },
          street: { type: String, default: "" },
          city:   { type: String, default: "" },
          state:  { type: String, default: "" },
        },
      },
    },

    // ✅ Payout system
    bankDetails: {
      bankName: String,
      bankCode: String,
      accountName: String,
      accountNumber: String,
      paystackRecipientCode: String,
    },
    payoutHistory: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "paid", "failed"],
          default: "pending",
        },
        referenceId: String,
      },
    ],
  },
  { timestamps: true }
);

// ✅ Add searchable text index
sellerSchema.index({
  name: "text",
  storeName: "text",
  businessName: "text",
  description: "text",
  story: "text",
});

export default mongoose.model("Seller", sellerSchema);

