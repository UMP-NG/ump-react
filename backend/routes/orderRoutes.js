import express from "express";
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
  bookDispatch,
  confirmTransfer,
  getEscrowDetails,
  getCurrentOrder,
  raiseDispute,
  hasPurchased,
} from "../controllers/orderController.js";
import { uploadPaymentProof } from "../middleware/upload.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { deliveryCodeLimiter } from "../middleware/rateLimits.js";

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

router.get("/has-purchased/:productId", protect, hasPurchased);

router.get(
  "/current",
  protect,
  requireRole("user", "seller", "admin"),
  getCurrentOrder
);

router.post(
  "/transfer",
  protect,
  requireRole("user", "seller", "admin"),
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
  checkoutCart
);

// ✅ Fetch user orders
router.get(
  "/my-orders",
  protect,
  requireRole("user", "seller", "admin"),
  getMyOrders
);

// ✅ Confirm delivery (release escrow) — rate-limited to prevent code brute-forcing
router.put(
  "/:orderId/confirm-delivery",
  protect,
  requireRole("user", "seller", "admin"),
  deliveryCodeLimiter,
  confirmDelivery
);

// ✅ Book BlackBox dispatch (seller only)
router.post(
  "/:orderId/book-dispatch",
  protect,
  requireRole("seller", "admin"),
  bookDispatch
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

router.post(
  "/:orderId/dispute",
  protect,
  requireRole("user", "seller", "admin"),
  raiseDispute
);

export default router;

