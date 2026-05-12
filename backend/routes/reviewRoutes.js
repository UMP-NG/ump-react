import express from "express";
import {
  addReview,
  getReviews,
  getAllReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Public — anyone can view reviews
router.get("/", getAllReviews);
router.get("/:refModel/:refId", getReviews);

// ✅ Authenticated — any user type can create/update/delete reviews
router.post(
  "/",
  protect,
  requireRole("user", "seller", "service_provider", "admin"),
  addReview
);

router.put(
  "/:reviewId",
  protect,
  requireRole("user", "seller", "service_provider", "admin"),
  updateReview
);

router.delete(
  "/:reviewId",
  protect,
  requireRole("user", "seller", "service_provider", "admin"),
  deleteReview
);

export default router;
