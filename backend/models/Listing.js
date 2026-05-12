import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Luxury 2BR Apartment"
    type: { type: String, enum: ["Apartment", "Hostel"], required: true },
    description: { type: String }, // full description of the listing
    price: { type: Number, required: true },
    rate: { type: String, default: "per Year" }, // e.g., "per Month", "per Year"
    location: { type: String, required: true },
    beds: { type: Number, default: 1 },
    baths: { type: Number, default: 1 },
    distance: { type: String }, // e.g., "500m from campus"
    amenities: [{ type: String }], // e.g., ["WiFi", "Water", "Electricity"]
    images: [
      {
        url: String,
        publicId: String,
      },
    ],

    videos: [
      {
        url: String,
        publicId: String,
      },
    ],
    available: { type: Boolean, default: true },
    furnished: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // owner of the listing
    reviews: [
      {
        stars: { type: Number, min: 1, max: 5 },
        name: String,
        year: Number,
        text: String,
      },
    ],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Listing", listingSchema);

