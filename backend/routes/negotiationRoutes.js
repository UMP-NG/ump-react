import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createNegotiation,
  respondToNegotiation,
  applyNegotiatedPrice,
  getMyNegotiations,
} from "../controllers/negotiationController.js";

const router = express.Router();

router.use(protect);

router.post("/", createNegotiation);
router.get("/", getMyNegotiations);
router.put("/:id/respond", respondToNegotiation);
router.put("/:id/apply", applyNegotiatedPrice);

export default router;
