import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDeliveryQuote, bookShipbubbleDelivery, getTrackingInfo } from "../controllers/deliveryController.js";

const router = express.Router();

router.get("/quote",          protect, getDeliveryQuote);
router.post("/book/:orderId", protect, bookShipbubbleDelivery);
router.get("/track/:orderId", protect, getTrackingInfo);

export default router;
