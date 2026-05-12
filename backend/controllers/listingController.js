// controllers/listingController.js
import Listing from "../models/Listing.js";
import cloudinary from "../config/cloudinary.js";

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
      rate,
      location,
      beds,
      baths,
      distance,
      amenities,
      furnished,
      available,
    } = req.body;

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
      price,
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
      owner: req.user._id,
    });

    res.status(201).json({ success: true, listing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

    Object.assign(listing, {
      ...req.body,
      type: listingType,
      images: [...listing.images, ...newImages],
      videos: [...listing.videos, ...newVideos],
      amenities: amenitiesArray,
    });

    await listing.save();
    res.json({ success: true, listing });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===============================
// Get all listings
// ===============================
export const getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find().populate("owner", "name email");
    res.json({ success: true, count: listings.length, listings });
  } catch (error) {
    console.error("Error fetching listings:", error);
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
    console.error("❌ Error fetching listing:", error);
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

    for (const image of listing.images || []) {
      if (image.publicId) await cloudinary.uploader.destroy(image.publicId, { resource_type: "image" });
    }
    for (const video of listing.videos || []) {
      if (video.publicId) await cloudinary.uploader.destroy(video.publicId, { resource_type: "video" });
    }

    await listing.deleteOne();
    res.json({ success: true, message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
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
    console.error("Error fetching my listings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

