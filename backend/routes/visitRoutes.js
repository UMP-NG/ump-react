import express from "express";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { recordVisit, recordHeartbeat } from "../controllers/visitController.js";

const router = express.Router();

router.post("/visit", optionalAuth, recordVisit);
router.post("/heartbeat", recordHeartbeat);

export default router;
