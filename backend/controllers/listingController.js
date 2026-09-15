// controllers/listingController.js
import Listing from "../models/Listing.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";

// Coerces to a non-negative, finite number — `Number("1e400") || 0` would
// otherwise pass Infinity straight through (Infinity is truthy and satisfies
// a plain `>= 0`/`min: 0` schema check), corrupting a stored money field.
function clampMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ===============================
// Create Listing
// ===============================
export const createListing = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      price,
      pricePerHalfYear,
      rate,
      location,
      beds,
      baths,
      distance,
      amenities,
      furnished,
      available,
      agreementFee,
      commissionFee,
      agentFee,
      cautionFee,
    } = req.body;

    // Reject missing/empty/null/whitespace-only before Number() coercion —
    // Number(null), Number(""), and Number("   ") all evaluate to 0, which
    // would otherwise silently pass a finite/non-negative check as a "valid"
    // price instead of being caught as a missing required field.
    const trimmedPrice = typeof price === "string" ? price.trim() : price;
    if (trimmedPrice === undefined || trimmedPrice === null || trimmedPrice === "") {
      return res.status(400).json({ message: "Price is required" });
    }
    const numericPrice = Number(trimmedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "A valid, non-negative price is required" });
    }

    // ✅ Ensure `type` is always a string
    const listingType = Array.isArray(type) ? type[0] : type;

    // ✅ Handle amenities safely (string or array)
    let amenitiesArray = [];
    if (Array.isArray(amenities)) {
      amenitiesArray = amenities.map((a) => a.trim());
    } else if (typeof amenities === "string") {
      amenitiesArray = amenities.split(",").map((a) => a.trim());
    }

    // ✅ Handle file uploads
    const images = req.files?.images
      ? req.files.images.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    const videos = req.files?.videos
      ? req.files.videos.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    const listing = await Listing.create({
      name,
      type: listingType,
      description,
      price: numericPrice,
      pricePerHalfYear: pricePerHalfYear != null && pricePerHalfYear !== "" ? clampMoney(pricePerHalfYear, null) : null,
      rate,
      location,
      beds,
      baths,
      distance,
      amenities: amenitiesArray,
      images,
      videos,
      furnished,
      available,
      agreementFee:  clampMoney(agreementFee),
      commissionFee: clampMoney(commissionFee),
      agentFee:      clampMoney(agentFee),
      cautionFee:    clampMoney(cautionFee),
      owner: req.user._id,
    });

    res.status(201).json({ success: true, listing });
  } catch (error) {
    logger.error("Error creating listing:", error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "production" ? undefined : error.message });
  }
};

// ===============================
// Update Listing
// ===============================
export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Handle new uploads
    const newImages = req.files?.images
      ? req.files.images.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    const newVideos = req.files?.videos
      ? req.files.videos.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    // Handle amenities
    let amenitiesArray = listing.amenities || [];
    if (req.body.amenities) {
      if (Array.isArray(req.body.amenities)) {
        amenitiesArray = req.body.amenities.map((a) => a.trim());
      } else if (typeof req.body.amenities === "string") {
        amenitiesArray = req.body.amenities.split(",").map((a) => a.trim());
      }
    }

    // Ensure `type` is a string
    const listingType = Array.isArray(req.body.type)
      ? req.body.type[0]
      : req.body.type || listing.type;

    // Whitelist — "owner" must never be settable here, and every fee/price
    // field is clamped to a non-negative number rather than trusted raw.
    const LISTING_EDITABLE_FIELDS = [
      "name", "description", "price", "pricePerHalfYear", "rate", "location",
      "beds", "baths", "distance", "furnished", "available",
      "agreementFee", "commissionFee", "agentFee", "cautionFee",
    ];
    const CLAMPED_FEE_FIELDS = ["agreementFee", "commissionFee", "agentFee", "cautionFee"];
    const safeUpdates = {};
    for (const key of LISTING_EDITABLE_FIELDS) {
      if (req.body[key] === undefined) continue;
      safeUpdates[key] = CLAMPED_FEE_FIELDS.includes(key)
        ? clampMoney(req.body[key])
        : req.body[key];
    }
    if (req.body.price !== undefined) {
      // Reject missing/empty/null/whitespace-only before Number() coercion —
      // Number(null), Number(""), and Number("   ") all evaluate to 0, which
      // would otherwise silently pass as a "valid" price update instead of
      // being caught as invalid input.
      const trimmedPrice = typeof req.body.price === "string" ? req.body.price.trim() : req.body.price;
      if (trimmedPrice === null || trimmedPrice === "") {
        return res.status(400).json({ message: "Price cannot be empty" });
      }
      const p = Number(trimmedPrice);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ message: "A valid, non-negative price is required" });
      }
      safeUpdates.price = p;
    }

    Object.assign(listing, {
      ...safeUpdates,
      type: listingType,
      images: [...listing.images, ...newImages],
      videos: [...listing.videos, ...newVideos],
      amenities: amenitiesArray,
    });

    await listing.save();
    res.json({ success: true, listing });
  } catch (error) {
    logger.error("Error updating listing:", error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "production" ? undefined : error.message });
  }
};

// ===============================
// Get all listings
// ===============================
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const LISTING_TYPES = ["Apartment", "Hostel"];

export const getAllListings = async (req, res) => {
  try {
    // Coerce query params — they can be string arrays when a key appears twice
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const type   = typeof req.query.type   === "string" ? req.query.type   : "";
    const limit  = req.query.limit;
    const filter = {};

    if (search.trim()) {
      if (search.length > 200)
        return res.status(400).json({ message: "Search query is too long" });
      const re = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: re }, { description: re }, { location: re }];
    }
    // Only apply type filter when it is one of the allowed enum values
    if (type && LISTING_TYPES.includes(type)) filter.type = type;

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50;

    const listings = await Listing.find(filter)
      .populate("owner", "name")   // email omitted — not needed on public listing list
      .limit(safeLimit);

    res.json({ success: true, count: listings.length, listings });
  } catch (error) {
    logger.error("Error fetching listings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Get listing by ID
// ===============================
// ✅ Get single listing by ID
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("owner", "name email")
      .populate({
        path: "reviews",
        populate: { path: "user", select: "name email" },
      });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // 🧠 Skip counting owner's own view
    const userId = req.user?._id?.toString();
    const ownerId = listing.owner?._id?.toString();

    if (userId && userId === ownerId) {
      return res.status(200).json({ success: true, listing });
    }

    // 🧠 Count view only once per logged-in user
    // Add in model: viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    if (userId) {
      const alreadyViewed = listing.viewedBy?.some(
        (viewerId) => viewerId.toString() === userId
      );

      if (!alreadyViewed) {
        listing.views = (listing.views || 0) + 1;
        listing.viewedBy = [...(listing.viewedBy || []), userId];
        await listing.save();
      }
    } else {
      // 🧠 Guest user → always count
      listing.views = (listing.views || 0) + 1;
      await listing.save();
    }

    res.status(200).json({ success: true, listing });
  } catch (error) {
    logger.error("❌ Error fetching listing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
    });
  }
};

// ===============================
// Delete listing
// ===============================
export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Soft-delete so active bookings/orders retain their listing reference.
    listing.deletedAt = new Date();
    await listing.save();
    res.json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    logger.error("Error deleting listing:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Get listings for logged-in seller/owner
// ===============================
export const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, listings });
  } catch (err) {
    logger.error("Error fetching my listings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

