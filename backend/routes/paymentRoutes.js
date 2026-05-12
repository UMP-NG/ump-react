import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  initializePayment,
  verifyPayment,
  getBanks,
  verifyAccount,
  saveBankDetails,
} from "../controllers/paymentController.js";
import { paystackWebhook } from "../controllers/paystackWebhook.js";

const router = express.Router();

router.post("/initialize", protect, initializePayment);
router.get("/verify", protect, verifyPayment);
router.post("/webhook", paystackWebhook);

// Seller bank setup
router.get("/banks", protect, getBanks);
router.get("/verify-account", protect, verifyAccount);
router.post("/bank-details", protect, saveBankDetails);

export default router;
