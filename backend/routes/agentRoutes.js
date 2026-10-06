import express from "express";
import { becomeAgent } from "../controllers/agentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/profile", protect, becomeAgent);

export default router;
