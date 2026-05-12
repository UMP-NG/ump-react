// controllers/bookingController.js
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Listing from "../models/Listing.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// ===============================
// CREATE BOOKING
// ===============================
export const createBooking = async (req, res) => {
  try {
    const { itemId, itemType, date, timeSlot, notes } = req.body;

    if (!itemId || !itemType || !date || !timeSlot) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    let item, provider, providerModel;

    if (itemType === "service") {
      item = await Service.findById(itemId);
      if (!item) return res.status(404).json({ message: "Service not found." });
      provider = item.provider; // service provider (user ID)
      providerModel = "User";
    } else if (itemType === "listing") {
      item = await Listing.findById(itemId);
      if (!item) return res.status(404).json({ message: "Listing not found." });
      provider = item.seller; // accommodation seller
      providerModel = "User";
    } else {
      return res.status(400).json({ message: "Invalid booking type." });
    }

    const booking = await Booking.create({
      user: req.user._id,
      item: item._id,
      itemModel: itemType === "service" ? "Service" : "Listing",
      provider,
      providerModel,
      date,
      timeSlot,
      notes,
    });

    // --- Send confirmation message to service provider ---
    try {
      const user = await User.findById(req.user._id);
      const itemName = item.name || item.title || "Service/Listing";
      const bookingMessage = `📅 New Booking Request\n\nName: ${user.name}\nEmail: ${user.email}\nService: ${itemName}\nDate: ${date}\nTime: ${timeSlot}\n${notes ? `Notes: ${notes}` : ""}`;

      const message = await Message.create({
        sender: req.user._id,
        receiver: provider,
        text: bookingMessage,
      });

    } catch (msgErr) {
      console.error("⚠️ Error sending booking confirmation message:", msgErr);
      // Don't fail the booking if message fails
    }

    res.status(201).json({
      success: true,
      message: `Booking created successfully for ${itemType}`,
      booking,
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// GET USER BOOKINGS
// ===============================
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("item")
      .populate("provider", "name email");

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("❌ Error fetching user bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// GET PROVIDER BOOKINGS
// ===============================
export const getProviderBookings = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build filter object
    const filter = { provider: req.user._id };
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("user", "name email avatar")
      .populate("item");

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("❌ Error fetching provider bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ACCEPT BOOKING
// ===============================
export const acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find booking and verify it belongs to the logged-in provider
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to accept this booking." });
    }

    // Update status to confirmed
    booking.status = "confirmed";
    await booking.save();

    // Send notification to client
    try {
      const user = await User.findById(booking.user);
      const item = await (booking.itemModel === "Service" 
        ? Service.findById(booking.item) 
        : Listing.findById(booking.item));

      if (user && item) {
        await Message.create({
          sender: req.user._id,
          receiver: booking.user,
          text: `✅ Your booking for "${item.title || item.name}" on ${booking.date} at ${booking.timeSlot} has been confirmed!`,
        });
      }
    } catch (msgErr) {
      console.warn("⚠️ Could not send acceptance notification:", msgErr);
    }

    res.json({
      success: true,
      message: "Booking accepted successfully.",
      booking,
    });
  } catch (error) {
    console.error("❌ Error accepting booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// REJECT BOOKING
// ===============================
export const rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find booking and verify it belongs to the logged-in provider
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to reject this booking." });
    }

    // Update status to cancelled
    booking.status = "cancelled";
    await booking.save();

    // Send notification to client
    try {
      const user = await User.findById(booking.user);
      const item = await (booking.itemModel === "Service" 
        ? Service.findById(booking.item) 
        : Listing.findById(booking.item));

      if (user && item) {
        await Message.create({
          sender: req.user._id,
          receiver: booking.user,
          text: `❌ Your booking for "${item.title || item.name}" on ${booking.date} at ${booking.timeSlot} has been rejected. Please try another date/provider.`,
        });
      }
    } catch (msgErr) {
      console.warn("⚠️ Could not send rejection notification:", msgErr);
    }

    res.json({
      success: true,
      message: "Booking rejected successfully.",
      booking,
    });
  } catch (error) {
    console.error("❌ Error rejecting booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};
