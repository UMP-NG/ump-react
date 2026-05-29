import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getVapidKey, subscribe, unsubscribe, sendTestPush, trackOpen, cleanupLocalhostSubs } from "../controllers/pushController.js";

const router = express.Router();

router.get("/vapid-key",    getVapidKey);
router.post("/subscribe",   protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);
router.post("/test",        protect, sendTestPush);
router.post("/open/:broadcastId",  trackOpen);
router.delete("/cleanup-localhost", protect, cleanupLocalhostSubs);

export default router;
