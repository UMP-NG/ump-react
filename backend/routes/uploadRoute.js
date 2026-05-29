import express from "express";
import { uploadSingle, uploadSingleMedia } from "../middleware/upload.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

// Fix #15: protect + rate-limit all upload endpoints
// Image upload
router.post("/", protect, uploadLimiter, uploadSingle, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.status(201).json({ success: true, url: req.file.path, publicId: req.file.filename });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// Video (or image) upload — accepts MP4, MOV, WebM in addition to images
router.post("/media", protect, uploadLimiter, uploadSingleMedia, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.status(201).json({
      success: true,
      url:      req.file.path,
      publicId: req.file.filename,
      isVideo:  req.file.isVideo || false,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed." });
  }
});

export default router;

