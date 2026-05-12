import Review from "../models/Review.js";

// ✅ Create Review
export const addReview = async (req, res) => {
  try {
    const { rating, text, refModel, refId } = req.body;

    if (!["Product", "Listing", "Service"].includes(refModel)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid review target" });
    }

    const review = await Review.create({
      refModel,
      refId,
      author: req.user._id,
      rating,
      text,
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error("Error adding review:", error);
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
    console.error("Error fetching reviews:", error);
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
    console.error("Error updating review:", error);
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
      req.user.role !== "admin"
    )
      return res.status(403).json({ success: false, message: "Unauthorized" });

    await review.deleteOne();
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
    console.error("Error fetching all reviews:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
