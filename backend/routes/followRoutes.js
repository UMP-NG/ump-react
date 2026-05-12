import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "../controllers/followController.js";

const router = express.Router();

// ✅ Follow someone (authenticated only)
router.post(
  "/:userId",
  protect,
  requireRole("user", "seller", "admin"),
  followUser
);

// ✅ Unfollow someone (authenticated only)
router.delete(
  "/:userId",
  protect,
  requireRole("user", "seller", "admin"),
  unfollowUser
);

// ✅ Get followers of a user (public)
router.get("/:userId/followers", getFollowers);

// ✅ Get users a person is following (public)
router.get("/:userId/following", getFollowing);

export default router;
