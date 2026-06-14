import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { quoteLimiter } from "../middleware/rateLimits.js";
import {
  getDeliveryQuote,
  bookShipbubbleDelivery,
  getTrackingInfo,
  getDeliveryLocations,
} from "../controllers/deliveryController.js";

const router = express.Router();

// /locations and /quote are open (no req.user needed) — rate-limited to guard the Shipbubble API
router.get("/locations",      getDeliveryLocations);
router.get("/quote",          quoteLimiter, getDeliveryQuote);
router.post("/book/:orderId", protect, bookShipbubbleDelivery);
router.get("/track/:orderId", protect, getTrackingInfo);

export default router;
