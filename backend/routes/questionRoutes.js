import express from "express";
import { getQuestions, askQuestion, answerQuestion, deleteQuestion } from "../controllers/questionController.js";
import { protect, requireRole, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:productId",              optionalAuth, getQuestions);
router.post("/:productId",             protect, askQuestion);
router.post("/:questionId/answer",     protect, requireRole("seller", "service_provider", "admin"), answerQuestion);
router.delete("/:questionId",          protect, deleteQuestion);

export default router;
