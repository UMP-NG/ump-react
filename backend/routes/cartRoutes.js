import express from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  checkoutCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getCart);
router.post("/add", protect, addToCart);
router.put("/update", protect, updateQuantity);
router.delete("/remove/:itemId", protect, removeFromCart);
router.post("/checkout", protect, checkoutCart);

export default router;

