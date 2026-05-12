import express from "express";
import {
  becomeSeller,
  getAllSellers,
  getSellerById,
  followSeller,
  unfollowSeller,
  incrementSellerView,
  getSellerProfile,
  requestSellerVerification,
} from "../controllers/sellerController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { handleSellerUpload } from "../middleware/uploadHandler.js";

const router = express.Router();

router.post("/profile", protect, handleSellerUpload, becomeSeller);
router.post("/request-verification", protect, requestSellerVerification);
router.get("/me", protect, requireRole("seller", "admin"), getSellerProfile);

// ✅ List all sellers (public)
router.get("/", getAllSellers);

// ✅ Follow a seller (any authenticated user)
router.post(
  "/:id/follow",
  protect,
  requireRole("user", "seller", "admin"),
  followSeller
);

// ✅ Unfollow a seller (any authenticated user)
router.post(
  "/:id/unfollow",
  protect,
  requireRole("user", "seller", "admin"),
  unfollowSeller
);

router.patch("/:id/view", incrementSellerView);

// ✅ Get seller info by ID (public)
router.get("/:id", getSellerById);

export default router;
