// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // person who made the booking
      required: true,
    },

    // The item being booked (can be Service or Listing)
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemModel", // dynamic reference
    },
    itemModel: {
      type: String,
      required: true,
      enum: ["Service", "Listing"], // dynamically handles both
    },

    // Who receives the booking (seller or service_provider)
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "providerModel",
    },
    providerModel: {
      type: String,
      required: true,
      enum: ["User", "service_provider"], // depends on type of item
    },

    // Booking details
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
