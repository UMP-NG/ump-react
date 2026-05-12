import Order from "../models/Order.js";
import express from "express";
import { protect as verifyToken } from "../middleware/authMiddleware.js";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  downloadInvoice,
  getIncomingOrders,
  checkoutCart,
  confirmDelivery,
  confirmTransfer,
  getEscrowDetails,
  getCurrentOrder,
} from "../controllers/orderController.js";
import { uploadPaymentProof } from "../middleware/upload.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Create order (user, seller, walker, admin)
router.post(
  "/",
  protect,
  requireRole("user", "seller", "admin"),
  createOrder
);

// GET /api/orders/me
router.get(
  "/me",
  protect,
  requireRole("user", "seller", "admin"),
  getMyOrders
);

router.get("/escrow-details", protect, getEscrowDetails);

router.get(
  "/current",
  protect,
  requireRole("user", "seller", "admin"),
  getCurrentOrder
);

router.post(
  "/transfer",
  protect,
  uploadPaymentProof,
  confirmTransfer
);

// ✅ Walker/Seller incoming orders
router.get(
  "/incoming",
  protect,
  requireRole( "seller", "admin"),
  getIncomingOrders
);

// ✅ Create order (checkout)
router.post(
  "/checkout",
  protect,
  requireRole("user", "seller", "admin"),
  verifyToken,
  checkoutCart
);

// ✅ Fetch user orders
router.get(
  "/my-orders",
  protect,
  requireRole("user", "seller", "admin"),
  verifyToken,
  getMyOrders
);

// ✅ Confirm delivery (release escrow)
router.put(
  "/:orderId/confirm-delivery",
  protect,
  requireRole("user", "seller", "admin"),
  verifyToken,
  confirmDelivery
);

router.get(
  "/:id",
  protect,
  requireRole("user", "seller", "admin"),
  getOrderById
);

router.put(
  "/:id",
  protect,
  requireRole("admin", "seller"),
  updateOrder
);

router.put(
  "/:id/status",
  protect,
  requireRole("user", "seller", "admin"),
  updateOrderStatus
);

router.get(
  "/:id/invoice",
  protect,
  requireRole("user", "seller", "admin"),
  downloadInvoice
);

router.delete(
  "/:id",
  protect,
  requireRole("user", "admin"),
  cancelOrder
);

export default router;

