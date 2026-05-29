import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true }, // provider display name
    title: { type: String, trim: true },                 // service headline

    // ── Pricing ────────────────────────────────────────────────────────────────
    pricingType: {
      type: String,
      enum: ["fixed", "hourly", "per_project", "starting_from", "negotiable", "free"],
      default: "fixed",
    },
    rate:     { type: Number, default: 0 }, // 0 = free / negotiable
    currency: { type: String, default: "NGN" },

    // ── Media (max 5 images, 1 video) ─────────────────────────────────────────
    images: [{ url: String, publicId: String }],
    video:  { url: String, publicId: String },

    // ── Description ────────────────────────────────────────────────────────────
    major: String,  // category
    desc:  String,  // short description shown on listing card
    about: String,  // detailed description

    // ── Credentials & links ────────────────────────────────────────────────────
    certifications: [String],
    portfolio:      [String], // portfolio URLs
    policies:       [String],
    tags:           [String],

    // ── Availability ───────────────────────────────────────────────────────────
    // Each slot: { day: "Monday", startTime: "09:00", endTime: "11:00" }
    timeSlots: [
      {
        day:       { type: String }, // "Monday" … "Sunday"
        startTime: { type: String }, // "09:00" (24-hr)
        endTime:   { type: String }, // "11:00"
      },
    ],
    available: { type: Boolean, default: true },
    duration:  { type: String }, // display string e.g. "2 hours", "3 days"

    // ── Quality signals ────────────────────────────────────────────────────────
    rating:       { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    verified:     { type: Boolean, default: false },
    verificationRequested: { type: Boolean, default: false },

    // ── Relations ──────────────────────────────────────────────────────────────
    provider: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    reviews:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

serviceSchema.index({ name: "text", title: "text", desc: "text", major: "text", tags: "text" });

export default mongoose.model("Service", serviceSchema);
