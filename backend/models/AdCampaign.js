import mongoose from "mongoose";

// Ad plans — prices in NGN. Mirror these in the frontend AD_PLANS constant.
export const AD_PLANS = {
  "3days":  { label: "Starter",  days: 3,  price: 1500 },
  "7days":  { label: "Standard", days: 7,  price: 3000 },
  "14days": { label: "Premium",  days: 14, price: 5500 },
};

const adCampaignSchema = new mongoose.Schema(
  {
    product:    { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    seller:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    plan:       { type: String, enum: Object.keys(AD_PLANS), required: true },
    amount:     { type: Number, required: true },
    status:     { type: String, enum: ["pending_payment", "active", "expired", "cancelled"], default: "pending_payment" },
    paymentRef: { type: String, default: null },
    startedAt:  { type: Date, default: null },
    endsAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

adCampaignSchema.index({ seller: 1, createdAt: -1 });
adCampaignSchema.index({ product: 1, status: 1 });
adCampaignSchema.index({ status: 1, endsAt: 1 });

export default mongoose.model("AdCampaign", adCampaignSchema);
