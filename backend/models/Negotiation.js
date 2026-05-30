import mongoose from "mongoose";

const negotiationSchema = new mongoose.Schema(
  {
    buyer:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemType: { type: String, enum: ["Product", "Service"], required: true },
    item:   { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "itemType" },
    itemName:  { type: String },
    itemImage: { type: String },
    originalPrice: { type: Number, required: true },
    proposedPrice: { type: Number, required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected", "applied"], default: "pending" },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

negotiationSchema.index({ buyer: 1, createdAt: -1 });
negotiationSchema.index({ seller: 1, createdAt: -1 });
negotiationSchema.index({ item: 1, buyer: 1 });

export default mongoose.model("Negotiation", negotiationSchema);
