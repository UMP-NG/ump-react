import mongoose from "mongoose";

// Singleton — one document stores all platform-wide settings.
// Use Config.findOneAndUpdate({}, ..., { upsert: true }) to read/write.
const configSchema = new mongoose.Schema(
  {
    fees: {
      platformFee:    { type: Number, default: 3.2, min: 0, max: 100 },
      serviceFee:     { type: Number, default: 5.0, min: 0, max: 100 },
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
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Config", configSchema);
