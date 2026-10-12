import express from "express";
import {
  addReview,
  getReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  replyToReview,
} from "../controllers/reviewController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Public — anyone can view reviews
router.get("/", getAllReviews);
router.get("/:refModel/:refId", getReviews);

// ✅ Authenticated — any user type can create/update/delete reviews.
// "user" alone already covers every account (it's never removed when a
// seller/provider/agent role is granted), but every role is listed
// explicitly here anyway so this isn't an implicit, easy-to-miss allowance.
router.post(
  "/",
  protect,
  requireRole("user", "seller", "service_provider", "agent", "admin"),
  addReview
);

router.put(
  "/:reviewId",
  protect,
  requireRole("user", "seller", "service_provider", "agent", "admin"),
  updateReview
);

router.delete(
  "/:reviewId",
  protect,
  requireRole("user", "seller", "service_provider", "agent", "admin"),
  deleteReview
);

router.put(
  "/:reviewId/reply",
  protect,
  requireRole("seller", "service_provider", "agent", "admin"),
  replyToReview
);

export default router;

