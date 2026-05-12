import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // Service or freelancer name
      trim: true,
    },
    title: {
      type: String,
      trim: true, // Short tagline
    },
    rate: {
      type: Number, // e.g., 5000
      required: true,
    },
    currency: {
      type: String,
      default: "NGN", // optional, e.g., NGN, USD
    },
    package: {
      type: String, // Basic / Standard / Premium
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationRequested: { type: Boolean, default: false },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    major: String, // category
    desc: String, // short description
    about: String, // detailed description
    certifications: [String],
    portfolio: [String],
    policies: [String],
    timeSlots: [String],
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // ✅ reference User instead of Seller
    },
    available: {
      type: Boolean,
      default: true,
    },
    // reviews references (Review model stores author, rating, text)
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    tags: [String],
    duration: {
      type: Number, // duration in hours or days
    },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
