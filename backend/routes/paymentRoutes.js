import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  initializePayment,
  verifyPayment,
  getBanks,
  verifyAccount,
  saveBankDetails,
  paystackWebhook,
  initializeSubscriptionPayment,
  verifySubscriptionPayment,
} from "../controllers/paymentController.js";
import {
  initializeFlwPayment,
  verifyFlwPayment,
  flutterwaveWebhook,
} from "../controllers/flutterwaveController.js";
import { paymentLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

// Paystack
router.post("/initialize", protect, paymentLimiter, initializePayment);
router.get("/verify", protect, paymentLimiter, verifyPayment);
router.post("/webhook/paystack", paystackWebhook);

// Flutterwave
router.post("/flw/initialize", protect, paymentLimiter, initializeFlwPayment);
router.get("/flw/verify", protect, paymentLimiter, verifyFlwPayment);
router.post("/webhook/flutterwave", flutterwaveWebhook);

// Subscription
router.post("/subscription/initialize", protect, paymentLimiter, initializeSubscriptionPayment);
router.get("/subscription/verify",      protect, paymentLimiter, verifySubscriptionPayment);

// Seller bank setup
router.get("/banks", protect, getBanks);
router.get("/verify-account", protect, verifyAccount);
router.post("/bank-details", protect, saveBankDetails);

export default router;

