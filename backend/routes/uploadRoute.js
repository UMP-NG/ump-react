import express from "express";
import { uploadSingle, uploadSingleMedia } from "../middleware/upload.js";

const router = express.Router();

// Image upload
router.post("/", uploadSingle, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.status(201).json({ success: true, url: req.file.path, publicId: req.file.filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Video (or image) upload — accepts MP4, MOV, WebM in addition to images
router.post("/media", uploadSingleMedia, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.status(201).json({
      success: true,
      url:      req.file.path,
      publicId: req.file.filename,
      isVideo:  req.file.isVideo || false,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

