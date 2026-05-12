import express from "express";
import { uploadSingle } from "../middleware/upload.js";

const router = express.Router();

router.post("/", uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.status(201).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
      type: req.file.resource_type,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

