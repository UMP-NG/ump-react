import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// Note: POST /become/seller and /become/service_provider used to be defined
// here too, but userRoutes.js is mounted before this router at the same
// /api/users prefix and defines the same paths — those handlers (routed to
// sellerController.becomeSeller / userController.becomeServiceProvider) are
// the ones that actually run; these were dead, divergent duplicates and have
// been removed.

// DELETE /api/users/provider — provider closes their own profile
router.delete("/provider", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.roles.includes("service_provider"))
      return res.status(400).json({ message: "Not a service provider" });

    // Block if the provider has bookings that are still active
    const activeBooking = await Booking.findOne({
      provider: user._id,
      status: { $in: ["pending", "confirmed"] },
    }).lean();
    if (activeBooking) {
      return res.status(409).json({
        message: "You have active bookings. Complete or cancel them before closing your profile.",
      });
    }

    // Update user first (critical state change), then soft-delete services
    user.roles = user.roles.filter((r) => r !== "service_provider");
    user.serviceProviderInfo = undefined;
    await user.save();

    await Service.updateMany({ provider: user._id }, { $set: { deletedAt: new Date() } });

    res.json({ message: "Provider profile closed. Your account remains active." });
  } catch (err) {
    console.error("closeProvider:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
