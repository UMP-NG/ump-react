import mongoose from "mongoose";

// ====== PRODUCT SCHEMA ======
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      trim: true,
    },

    desc: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },

    images: [
      {
        url: String,
        publicId: String,
      },
    ],

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ✅ seller is a User
      required: true,
    },

    // ✅ Auto availability
    isAvailable: {
      type: Boolean,
      default: true,
    },

    isAdvertised: { type: Boolean, default: false },

    condition: {
      type: String,
      enum: ["New", "Used"],
      default: "New",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },

    // Store color metadata (name + hex code) as subdocuments
    colors: {
      type: [
        {
          name: { type: String, trim: true },
          code: { type: String, trim: true },
        },
      ],
      default: [],
    },

    specs: {
      type: mongoose.Schema.Types.Mixed, // flexible object
      default: {},
    },

    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ New Analytics Fields
    views: {
      type: Number,
      default: 0,
    },

    purchases: {
      type: Number,
      default: 0,
    },

    stock: {
      type: Number,
      default: 1,
    },

    deliveryFee: { type: Number, default: 0, min: [0, "Delivery fee cannot be negative"] },

    // Optional hostel/real estate fields
    location: String,
    beds: Number,
    baths: Number,
    amenities: [String],
    distance: String,
  },
  { timestamps: true }
);

// ====== PRE-SAVE HOOKS ======
productSchema.pre("save", function (next) {
  // ✅ Generate slug if missing
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  // ✅ Auto-update availability
  // variants support removed — compute availability from top-level stock only
  const totalStock = this.stock || 0;
  this.isAvailable = totalStock > 0;

  next();
});

export default mongoose.model("Product", productSchema);

