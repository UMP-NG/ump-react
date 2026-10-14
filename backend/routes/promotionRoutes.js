import express from "express";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  cancelPromotion,
  deletePromotion,
} from "../controllers/promotionController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, requireRole("admin"), listPromotions);
router.post("/", protect, requireRole("admin"), createPromotion);
router.put("/:id", protect, requireRole("admin"), updatePromotion);
router.delete("/:id/permanent", protect, requireRole("admin"), deletePromotion);
router.delete("/:id", protect, requireRole("admin"), cancelPromotion);

export default router;
