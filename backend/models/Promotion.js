import mongoose from "mongoose";

// Admin-created, store-scoped discount campaign. Percentage-based, capped at
// a maximum number of units sold, and time-bound — when either limit is hit
// the affected products revert to their normal price automatically (see
// promotionController.js's revertPromotionProducts / the expiry cron in
// server.js).
const promotionSchema = new mongoose.Schema(
  {
    seller:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }],

    discountPercent: { type: Number, required: true, min: 1, max: 95 },

    // Unit-based cap — counts total quantity sold across all promoted
    // products combined, incremented as orders are paid for (see
    // confirmOrders.js).
    maxUnits:  { type: Number, required: true, min: 1 },
    unitsSold: { type: Number, default: 0, min: 0 },

    startsAt: { type: Date, default: Date.now },
    endsAt:   { type: Date, required: true },

    status: {
      type: String,
      enum: ["active", "expired", "depleted", "cancelled"],
      default: "active",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

promotionSchema.index({ status: 1, endsAt: 1 });
promotionSchema.index({ seller: 1 });

export default mongoose.model("Promotion", promotionSchema);
