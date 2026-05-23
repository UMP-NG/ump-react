import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getVapidKey, subscribe, unsubscribe } from "../controllers/pushController.js";

const router = express.Router();

router.get("/vapid-key",    getVapidKey);          // public — needed before login to show permission prompt
router.post("/subscribe",   protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);

export default router;
