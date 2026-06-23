import mongoose from "mongoose";
import crypto from "crypto";

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
    isFlagged:    { type: Boolean, default: false },
    isRemoved:    { type: Boolean, default: false },

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

    sizes: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    types: {
      type: [{ type: String, trim: true }],
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

    // Optional hostel/real estate fields
    location: String,
    beds: Number,
    baths: Number,
    amenities: [String],
    distance: String,

    // ── Paid ads ────────────────────────────────────────────────────────────────
    // null = admin-promoted (never expires); Date = paid campaign expiry
    adEndsAt: { type: Date, default: null },

    // ── Flash Sale ──────────────────────────────────────────────────────────────
    salePrice:  { type: Number, default: null, min: [0, "Sale price cannot be negative"] },
    saleEndsAt: { type: Date,   default: null },

    // ── Restock alerts ──────────────────────────────────────────────────────────
    restockSubscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Price-drop watchers ──────────────────────────────────────────────────────
    priceWatchers: [{
      user:                { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      priceAtSubscription: { type: Number, min: 0, required: true },
    }],

    // Priced variants — each has its own label, price, and stock.
    // When variants exist the top-level price/stock/isAvailable are
    // derived from the variants array in the pre-save hook.
    variants: {
      type: [
        {
          label: { type: String, trim: true, required: true },
          price: { type: Number, required: true, min: 0 },
          stock: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },

    // Soft-delete: set instead of destroying the document.
    // Orders referencing this product keep their product snapshot intact.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ====== PRE-SAVE HOOKS ======
productSchema.pre("save", function (next) {
  // Generate slug on first save — always includes a random 6-char hex suffix so
  // two sellers (or the same seller) can create products with identical names
  // without hitting the unique index.
  if (!this.slug && this.name) {
    const base = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    this.slug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
  }

  // When variants exist, derive price/stock/isAvailable from them.
  if (this.variants?.length > 0) {
    const prices = this.variants.map((v) => v.price).filter((p) => typeof p === "number" && p >= 0);
    this.price = prices.length ? Math.min(...prices) : 0;
    const totalVariantStock = this.variants.reduce((s, v) => s + (v.stock || 0), 0);
    this.stock = totalVariantStock;
    this.isAvailable = totalVariantStock > 0;
  } else {
    this.isAvailable = (this.stock || 0) > 0;
  }

  next();
});

productSchema.index({ seller: 1, createdAt: -1 });
productSchema.index({ isFlagged: 1, isRemoved: 1, createdAt: -1 });
productSchema.index({ deletedAt: 1 });

// Automatically exclude soft-deleted products from all find queries.
// Admin code that needs to see deleted items should call .setOptions({ includeDeleted: true }).
productSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

export default mongoose.model("Product", productSchema);

