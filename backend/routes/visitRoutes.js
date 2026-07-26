import express from "express";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { recordVisit } from "../controllers/visitController.js";

const router = express.Router();

router.post("/visit", optionalAuth, recordVisit);

export default router;
