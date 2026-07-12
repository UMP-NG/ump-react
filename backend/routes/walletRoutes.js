import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import {
  getWallet,
  getWalletForAdmin,
  saveBankDetails,
  transferFunds,
  requestWithdrawal,
  getTransactionHistory,
  creditWallet,
  debitWallet,
  giftCredits,
  verifyBankDetails,
  getAllGifts,
} from "../controllers/walletController.js";

const router = express.Router();

// ✅ User wallet endpoints (protected)
router.get("/", protect, getWallet);
router.post("/bank-details", protect, saveBankDetails);
router.post("/transfer", protect, transferFunds);
router.post("/withdraw", protect, requestWithdrawal);
router.get("/history", protect, getTransactionHistory);

// ✅ Admin wallet management (admin only)
// NOTE: "/admin/gifts" must be registered before "/admin/:userId" or the
// param route would swallow it (treating "gifts" as a userId).
router.get("/admin/gifts", protect, requireRole("admin"), getAllGifts);
router.get("/admin/:userId", protect, requireRole("admin"), getWalletForAdmin);
router.post("/credit", protect, requireRole("admin"), creditWallet);
router.post("/debit", protect, requireRole("admin"), debitWallet);
router.post("/gift", protect, requireRole("admin"), giftCredits); // Non-withdrawable gift credits
router.post("/verify-bank/:userId", protect, requireRole("admin"), verifyBankDetails);

export default router;
