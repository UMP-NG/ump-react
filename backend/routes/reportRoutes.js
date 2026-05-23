import express from "express";
import Report from "../models/Report.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/reports  — submit a new report (any authenticated user)
router.post("/", protect, async (req, res) => {
  try {
    const { refModel, refId, reason, description } = req.body;
    if (!refModel || !refId || !reason)
      return res.status(400).json({ message: "refModel, refId and reason are required" });

    const VALID_MODELS = ["Product", "Listing", "Service", "Seller", "User"];
    if (!VALID_MODELS.includes(refModel))
      return res.status(400).json({ message: "Invalid refModel" });

    // One open report per user per item is enough
    const existing = await Report.findOne({
      refModel, refId,
      reporter: req.user._id,
      status: "open",
    });
    if (existing)
      return res.status(400).json({ message: "You have already reported this content" });

    const report = await Report.create({
      refModel,
      refId,
      reporter: req.user._id,
      reason,
      description: description || "",
    });

    res.status(201).json({ success: true, reportId: report._id });
  } catch (err) {
    console.error("createReport:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
