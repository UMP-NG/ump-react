import express from "express";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { submitFeedback } from "../controllers/feedbackController.js";

const router = express.Router();

router.post("/", optionalAuth, submitFeedback);

export default router;
