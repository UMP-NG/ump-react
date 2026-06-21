import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action:   { type: String, required: true, index: true },
    entity:   { type: String, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    amount:   { type: Number },
    meta:     { type: mongoose.Schema.Types.Mixed },
    ip:       { type: String },
    userAgent:{ type: String },
    status:   { type: String, enum: ["ok", "fail"], default: "ok" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: 1 }); // indexed for range queries — no TTL, financial records are permanent

export default mongoose.model("AuditLog", auditLogSchema);
