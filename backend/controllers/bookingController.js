// controllers/bookingController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Listing from "../models/Listing.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Negotiation from "../models/Negotiation.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";

// ===============================
// CREATE BOOKING
// ===============================
export const createBooking = async (req, res) => {
  try {
    const { itemId, itemType, date, timeSlot, notes, negotiationId, creditToUse, offerDescription, offeredPrice } = req.body;

    if (!itemId || !itemType || !date || !timeSlot) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Reject past dates — compare date strings in YYYY-MM-DD format (server local date)
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (date < todayStr) {
      return res.status(400).json({ message: "Booking date cannot be in the past." });
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

    const clash = await Booking.findOne({
      item: item._id,
      date,
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });
    if (clash) {
      return res.status(409).json({ message: "This time slot is already booked. Please choose a different slot or date." });
    }

    // Resolve negotiated rate for service bookings
    let negotiatedRate = null;
    let resolvedNegotiationId = null;
    let resolvedOfferDescription = null;
    if (itemType === "service" && negotiationId) {
      if (!mongoose.Types.ObjectId.isValid(negotiationId)) {
        return res.status(400).json({ message: "Invalid negotiation ID." });
      }
      const neg = await Negotiation.findById(negotiationId);
      if (neg && neg.status === "accepted" && neg.buyer.toString() === req.user._id.toString() && neg.item.toString() === item._id.toString()) {
        negotiatedRate = neg.proposedPrice;
        resolvedNegotiationId = neg._id;
        neg.status = "applied";
        await neg.save();
        if (neg.messageId) {
          await Message.findByIdAndUpdate(neg.messageId, { "meta.status": "applied" });
        }
      }
    } else if (itemType === "service" && !negotiationId && offeredPrice) {
      // Negotiable service booked directly with a price offer from the booking form
      const parsed = Number(offeredPrice);
      if (!isNaN(parsed) && parsed > 0) {
        negotiatedRate = parsed;
        resolvedOfferDescription = typeof offerDescription === "string" ? offerDescription.trim() : null;
      }
    }

    // ── Referral credit ────────────────────────────────────────────────────────
    const booker        = await User.findById(req.user._id).select("referralCredit").lean();
    const available     = booker?.referralCredit || 0;
    const itemRate      = negotiatedRate ?? item.rate ?? 0;
    const creditApplied = Math.min(Math.max(0, Number(creditToUse) || 0), available, itemRate);
    if (creditApplied > 0) {
      // Atomic deduction with $gte guard — prevents double-spend across concurrent requests
      const updated = await User.findOneAndUpdate(
        { _id: req.user._id, referralCredit: { $gte: creditApplied } },
        { $inc: { referralCredit: -creditApplied } },
        { new: false }
      );
      if (!updated) {
        return res.status(400).json({ message: "Insufficient referral credit — it may have been used in another request." });
      }
    }

    let booking;
    try {
      booking = await Booking.create({
        user: req.user._id,
        item: item._id,
        itemModel: itemType === "service" ? "Service" : "Listing",
        provider,
        providerModel,
        date,
        timeSlot,
        notes,
        creditUsed: creditApplied,
        ...(negotiatedRate !== null && { negotiatedRate, negotiationId: resolvedNegotiationId }),
        ...(resolvedOfferDescription && { offerDescription: resolvedOfferDescription }),
      });
    } catch (createErr) {
      // Unique index violation — two requests raced past the findOne check
      if (createErr.code === 11000) {
        return res.status(409).json({ message: "This time slot is already booked. Please choose a different slot or date." });
      }
      throw createErr;
    }

    // --- Send confirmation message to service provider ---
    try {
      const user = await User.findById(req.user._id).lean();
      if (user) {
      const itemName = item.name || item.title || "Service/Listing";
      const bookingMessage = `📅 New Booking Request\n\nName: ${user.name}\nEmail: ${user.email}\nService: ${itemName}\nDate: ${date}\nTime: ${timeSlot}${negotiatedRate !== null ? `\nOffered rate: ₦${Number(negotiatedRate).toLocaleString()}` : ""}${resolvedOfferDescription ? `\nOffer description: ${resolvedOfferDescription}` : ""}\n${notes ? `Notes: ${notes}` : ""}`;

      await Message.create({
        sender: req.user._id,
        receiver: provider,
        text: bookingMessage,
      });
      } // end if (user)
    } catch (msgErr) {
      logger.error("⚠️ Error sending booking confirmation message:", msgErr);
      // Don't fail the booking if message fails
    }

    // Notify provider of new booking
    if (provider) {
      notify(provider, {
        type: "booking",
        title: "New booking request",
        message: `You have a new booking request for ${item.name || item.title || "your listing"} on ${date} at ${timeSlot}.`,
        link: "/messages",
      });
    }
    // Notify user their booking was submitted
    notify(req.user._id, {
      type: "booking",
      title: "Booking request sent",
      message: `Your booking for ${item.name || item.title || "the service"} on ${date} at ${timeSlot} has been submitted.`,
      link: "/orders",
    });

    res.status(201).json({
      success: true,
      message: `Booking created successfully for ${itemType}`,
      booking,
    });
  } catch (error) {
    logger.error("❌ Error creating booking:", error);
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
    logger.error("❌ Error fetching user bookings:", error);
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
    logger.error("❌ Error fetching provider bookings:", error);
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
        await notify(booking.user, {
          type: "order",
          title: "Booking confirmed!",
          message: `Your booking for "${item.title || item.name}" on ${booking.date} at ${booking.timeSlot} has been confirmed.`,
          link: "/bookings",
        }).catch(() => {});
      }
    } catch (msgErr) {
      logger.warn("⚠️ Could not send acceptance notification:", msgErr);
    }

    res.json({
      success: true,
      message: "Booking accepted successfully.",
      booking,
    });
  } catch (error) {
    logger.error("❌ Error accepting booking:", error);
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
        await notify(booking.user, {
          type: "order",
          title: "Booking rejected",
          message: `Your booking for "${item.title || item.name}" was not accepted. Try another date or provider.`,
          link: "/services",
        }).catch(() => {});
      }
    } catch (msgErr) {
      logger.warn("⚠️ Could not send rejection notification:", msgErr);
    }

    res.json({
      success: true,
      message: "Booking rejected successfully.",
      booking,
    });
  } catch (error) {
    logger.error("❌ Error rejecting booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// COMPLETE BOOKING (by client or provider)
// ===============================
export const completeBooking = async (req, res) => {
  try {
    // Populate item so we can read its rate for non-negotiated bookings
    const booking = await Booking.findById(req.params.bookingId).populate("item", "rate title name");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "confirmed") return res.status(400).json({ message: "Only confirmed bookings can be completed" });

    const isClient   = booking.user.toString()    === req.user._id.toString();
    const isProvider = booking.provider.toString() === req.user._id.toString();
    if (!isClient && !isProvider && !req.user.roles?.includes("admin")) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Atomic status update — prevents double-completion race condition
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: "confirmed" },
      { $set: { status: "completed" } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ message: "Booking has already been completed or modified" });

    // Reattach the populated item so the frontend response includes full item data
    updated.item = booking.item;

    // Credit provider's earnings — negotiated rate takes priority, falls back to item's listed rate
    const earnings = booking.negotiatedRate ?? booking.item?.rate ?? 0;
    if (earnings > 0) {
      await User.findByIdAndUpdate(booking.provider, { $inc: { earningsBalance: earnings } });
    }

    notify(booking.provider, {
      type: "order",
      title: "Booking completed",
      message: earnings > 0 ? `₦${Number(earnings).toLocaleString("en-NG")} has been added to your wallet.` : "Your booking has been marked as completed.",
      link: "/provider-analytics",
    }).catch(() => {});

    notify(booking.user, {
      type: "order",
      title: "Booking completed",
      message: `Your booking session has been marked as completed.`,
      link: "/my-bookings",
    }).catch(() => {});

    res.json({ success: true, booking: updated });
  } catch (err) {
    logger.error("completeBooking:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// GET BOOKED SLOTS FOR AN ITEM+DATE
// ===============================
export const getBookedSlots = async (req, res) => {
  try {
    const { itemId, date } = req.query;
    if (!itemId || !date) {
      return res.status(400).json({ message: "itemId and date are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }
    const bookings = await Booking.find({
      item: new mongoose.Types.ObjectId(itemId),
      date,
      status: { $in: ["pending", "confirmed"] },
    }).select("timeSlot");
    res.json({ bookedSlots: bookings.map((b) => b.timeSlot) });
  } catch (error) {
    logger.error("❌ Error fetching booked slots:", error);
    res.status(500).json({ message: "Server error" });
  }
};

