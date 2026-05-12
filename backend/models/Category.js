import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    subcategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },
    ],
  },
  { timestamps: true }
);

categorySchema.index({ name: "text", description: "text" });

export default mongoose.model("Category", categorySchema);
