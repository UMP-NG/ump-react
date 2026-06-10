import express from "express";
import { applyCoupon, getCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/couponController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Buyer validates a coupon at checkout
router.post("/apply", protect, applyCoupon);

// Admin CRUD
router.get("/",          protect, requireRole("admin"), getCoupons);
router.post("/",         protect, requireRole("admin"), createCoupon);
router.put("/:id",       protect, requireRole("admin"), updateCoupon);
router.delete("/:id",    protect, requireRole("admin"), deleteCoupon);

export default router;
