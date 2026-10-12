import express from "express";
import {
  listPromotions,
  createPromotion,
  cancelPromotion,
} from "../controllers/promotionController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, requireRole("admin"), listPromotions);
router.post("/", protect, requireRole("admin"), createPromotion);
router.delete("/:id", protect, requireRole("admin"), cancelPromotion);

export default router;
