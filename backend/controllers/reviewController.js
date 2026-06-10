import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Listing from "../models/Listing.js";
import Service from "../models/Service.js";
import Order from "../models/Order.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";

// ✅ Create Review
export const addReview = async (req, res) => {
  try {
    const { rating, text, refModel, refId } = req.body;

    if (!["Product", "Listing", "Service"].includes(refModel)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid review target" });
    }

    // Block duplicate reviews from the same user on the same item
    const existing = await Review.findOne({ refModel, refId, author: req.user._id }).select("_id").lean();
    if (existing) {
      return res.status(409).json({ success: false, message: "You have already reviewed this item." });
    }

    if (refModel === "Product") {
      const product = await Product.findById(refId).select("seller").lean();
      // Block self-reviews
      if (product?.seller?.toString() === req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You cannot review your own product." });
      }
      const hasOrder = await Order.findOne({
        buyer: req.user._id,
        "items.product": refId,
        status: { $in: ["confirmed", "shipped", "completed"] },
      }).select("_id");
      if (!hasOrder) {
        return res.status(403).json({ success: false, message: "Only verified buyers can review this product." });
      }
    }

    if (refModel === "Service") {
      const service = await Service.findById(refId).select("provider").lean();
      if (service?.provider?.toString() === req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You cannot review your own service." });
      }
    }

    if (refModel === "Listing") {
      const listing = await Listing.findById(refId).select("owner").lean();
      if (listing?.owner?.toString() === req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You cannot review your own listing." });
      }
    }

    const review = await Review.create({
      refModel,
      refId,
      author: req.user._id,
      rating,
      text,
    });

    // Notify item owner of new review (best-effort, non-blocking)
    try {
      const MODEL_MAP = { Product, Listing, Service };
      const Model = MODEL_MAP[refModel];
      if (Model) {
        const item = await Model.findById(refId).select("seller provider name title").lean();
        const ownerId = item?.seller || item?.provider;
        const itemName = item?.name || item?.title || refModel.toLowerCase();
        if (ownerId) {
          notify(ownerId, {
            type: "review",
            title: `New ${rating}-star review`,
            message: `Someone left a ${rating}-star review on your ${itemName}.`,
            link: "/seller-dashboard",
          });
        }
      }
    } catch {}

    res.status(201).json({ success: true, review });
  } catch (error) {
    logger.error("Error adding review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all reviews for a specific entity
export const getReviews = async (req, res) => {
  try {
    const { refModel, refId } = req.params;
    const reviews = await Review.find({ refModel, refId }).populate(
      "author",
      "name avatar"
    );

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    logger.error("Error fetching reviews:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update a review
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, text } = req.body;

    const review = await Review.findById(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });

    if (review.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Unauthorized" });

    review.rating = rating ?? review.rating;
    review.text = text ?? review.text;

    await review.save();
    res.json({ success: true, review });
  } catch (error) {
    logger.error("Error updating review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });

    if (
      review.author.toString() !== req.user._id.toString() &&
      !req.user.roles?.includes("admin")
    )
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await review.deleteOne();
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    logger.error("Error deleting review:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Seller reply to a review
export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ message: "Reply text is required" });

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Verify the requester owns the reviewed item — deny if model is unrecognised
    const MODEL_MAP = { Product, Listing, Service };
    const Model = MODEL_MAP[review.refModel];
    if (!Model) return res.status(400).json({ message: "Invalid review type" });

    if (!req.user.roles?.includes("admin")) {
      const item = await Model.findById(review.refId).select("seller provider owner").lean();
      const ownerId = (item?.seller || item?.provider || item?.owner)?.toString();
      if (ownerId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only the seller can reply to this review" });
      }
    }

    review.sellerReply = reply.trim();
    review.sellerRepliedAt = new Date();
    await review.save();

    // Build a sensible deep-link based on what was reviewed
    const reviewLink = review.refModel === "Product"
      ? `/products/${review.refId}`
      : review.refModel === "Service"
        ? `/services/${review.refId}`
        : `/hostel/${review.refId}`;

    notify(review.author, {
      type: "review",
      title: "Seller replied to your review",
      message: reply.slice(0, 100),
      link: reviewLink,
    }).catch(() => {});

    res.json({ success: true, review });
  } catch (err) {
    logger.error("replyToReview:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all reviews (admin/public)
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("author", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    logger.error("Error fetching all reviews:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

