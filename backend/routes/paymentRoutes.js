import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  initializePayment,
  verifyPayment,
  getBanks,
  verifyAccount,
  saveBankDetails,
  paystackWebhook,
} from "../controllers/paymentController.js";
import { paymentLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

router.post("/initialize", protect, paymentLimiter, initializePayment);
router.get("/verify", protect, paymentLimiter, verifyPayment);
router.post("/webhook", paystackWebhook);

// Seller bank setup
router.get("/banks", protect, getBanks);
router.get("/verify-account", protect, verifyAccount);
router.post("/bank-details", protect, saveBankDetails);

export default router;

