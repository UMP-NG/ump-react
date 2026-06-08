import mongoose from "mongoose";

// Singleton — one document stores all platform-wide settings.
// Use Config.findOneAndUpdate({}, ..., { upsert: true }) to read/write.
const configSchema = new mongoose.Schema(
  {
    fees: {
      // Buyer-facing service charge (platform convenience fee)
      serviceChargeEnabled: { type: Boolean, default: true },
      serviceFee:           { type: Number,  default: 5.0, min: 0, max: 100 }, // % of subtotal
      serviceChargeMin:     { type: Number,  default: 100, min: 0 },           // ₦ floor
      serviceChargeMax:     { type: Number,  default: 2000, min: 0 },          // ₦ cap

      // Seller-facing platform fee (deducted from payout) — OFF by default
      platformFeeEnabled: { type: Boolean, default: false },
      platformFee:        { type: Number,  default: 5.0, min: 0, max: 100 },   // % of seller subtotal

      minPayout:      { type: Number, default: 2000, min: 0 },
      payoutCadence:  { type: String, default: "Daily" },
    },
    flags: {
      hostelListings:       { type: Boolean, default: true },
      serviceMarketplace:   { type: Boolean, default: true },
      walletTopup:          { type: Boolean, default: true },
      autoTranslate:        { type: Boolean, default: false },
      aiListingAssistant:   { type: Boolean, default: false },
      maintenanceMode:      { type: Boolean, default: false },
    },
    slides: [
      {
        title:    String,
        subtitle: String,
        ctaLabel: String,
        url:      String,
        image:    { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
        on:       { type: Boolean, default: true },
      },
    ],
    logo: {
      url:       { type: String, default: "" },
      publicId:  { type: String, default: "" },
    },
    subscriptions: {
      seller: {
        monthly: { price: { type: Number, default: 3000 }, label: { type: String, default: "Monthly" } },
        annual:  { price: { type: Number, default: 25000 }, label: { type: String, default: "Annual" }, badge: { type: String, default: "Save 31%" } },
      },
      provider: {
        monthly: { price: { type: Number, default: 3000 }, label: { type: String, default: "Monthly" } },
        annual:  { price: { type: Number, default: 25000 }, label: { type: String, default: "Annual" }, badge: { type: String, default: "Save 31%" } },
      },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Config", configSchema);
