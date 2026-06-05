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

    // Negotiated price (services only) — set when buyer books after a negotiation is accepted
    negotiatedRate:  { type: Number, default: null },
    negotiationId:   { type: mongoose.Schema.Types.ObjectId, ref: "Negotiation", default: null },
    creditUsed:      { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Atomic uniqueness guarantee — prevents race-condition double-bookings at the DB level.
// Only active (pending/confirmed) bookings count; cancelled/completed slots can be re-booked.
bookingSchema.index(
  { item: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
  }
);

export default mongoose.model("Booking", bookingSchema);

