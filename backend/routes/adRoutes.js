import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimits.js";
import {
  initiateAdPayment,
  verifyAdPayment,
  getMyAdCampaigns,
  getAllAdCampaigns,
  cancelAdCampaign,
  getAdPlans,
} from "../controllers/adController.js";

const router = express.Router();

// Seller routes
router.get ("/plans",     protect,                 getAdPlans);
router.post("/initiate",  protect, paymentLimiter, initiateAdPayment);
router.get ("/verify",    protect, paymentLimiter, verifyAdPayment);
router.get ("/my",        protect,                 getMyAdCampaigns);
router.put ("/:id/cancel", protect,                cancelAdCampaign);

// Admin routes
router.get("/", protect, requireRole("admin"), getAllAdCampaigns);

export default router;
