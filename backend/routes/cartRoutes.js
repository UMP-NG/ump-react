import express from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getCart);
router.post("/add", protect, addToCart);
router.put("/update", protect, updateQuantity);
router.delete("/remove/:itemId", protect, removeFromCart);
// Checkout lives at POST /api/orders/checkout (orderController.checkoutCart) —
// that's the only checkout path; it handles stock checks, per-seller order
// splitting, coupons, and wallet/credit spend that this route never did.

export default router;

