import mongoose from "mongoose";

const verificationRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Institution form fields
    institution:  { type: String, required: true, trim: true },
    firstName:    { type: String, required: true, trim: true },
    middleName:   { type: String, trim: true, default: "" },
    lastName:     { type: String, required: true, trim: true },
    matricNumber: { type: String, required: true, trim: true, uppercase: true },
    department:   { type: String, required: true, trim: true },
    faculty:      { type: String, required: true, trim: true },

    // Uploaded school document
    documentUrl:      { type: String, required: true },
    documentPublicId: { type: String, default: "" },

    // Lifecycle
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "conflict"],
      default: "pending",
    },
    adminNote:     { type: String, default: "" },

    // Set when duplicate identity found — points to the existing verified user
    conflictWith:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Set when the disputing user raises a claim
    disputeReason: { type: String, default: "" },
    disputeRaisedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Partial index: only stores APPROVED records → duplicate check is O(1)
// instead of scanning all statuses and filtering in memory.
verificationRequestSchema.index(
  { institution: 1, matricNumber: 1 },
  { partialFilterExpression: { status: "approved" }, name: "idx_dedup_approved" }
);

// Compound index: covers "find by user + filter by status" in a single scan.
verificationRequestSchema.index({ user: 1, status: 1 }, { name: "idx_user_status" });

// Unique partial index: prevents TOCTOU race — only one active (pending/conflict)
// request per user at the DB level. On duplicate insert, MongoDB throws E11000
// which the route handler catches and converts to a 409.
verificationRequestSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "conflict"] } },
    name: "idx_user_active_unique",
  }
);

// Admin list: filter by status, sorted newest-first.
verificationRequestSchema.index({ status: 1, createdAt: -1 }, { name: "idx_status_date" });

export default mongoose.model("VerificationRequest", verificationRequestSchema);
