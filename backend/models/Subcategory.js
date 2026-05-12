import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
  },
  { timestamps: true }
);

// unique index per parent to avoid duplicate subcategory names for same category
subcategorySchema.index({ parent: 1, name: 1 }, { unique: true });

export default mongoose.model("Subcategory", subcategorySchema);

