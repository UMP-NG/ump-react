import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType:  { type: String, enum: ["percent", "fixed"], required: true },
    discountValue: {
      type: Number, required: true, min: 0,
      validate: {
        validator(v) { return this.discountType !== "percent" || v <= 100; },
        message: "Percent discount cannot exceed 100%",
      },
    },
    minOrderAmount:{ type: Number, default: 0, min: 0 },
    maxUses:       { type: Number, default: null },
    usedCount:     { type: Number, default: 0 },
    expiresAt:     { type: Date,   default: null },
    active:        { type: Boolean, default: true },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);
