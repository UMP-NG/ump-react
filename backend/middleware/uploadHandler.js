import { uploadSellerMedia, uploadServiceImages } from "./upload.js";

export const handleSellerUpload = (req, res, next) => {
  // Set a longer timeout for Cloudinary uploads (60 seconds)
  const uploadTimeout = setTimeout(() => {
    if (!res.headersSent) {
      return res.status(408).json({
        success: false,
        message: "Upload timeout - Cloudinary service may be slow. Please try again.",
      });
    }
  }, 60000); // 60 second timeout

  // Only require logo, banner is optional
  uploadSellerMedia(req, res, (err) => {
    clearTimeout(uploadTimeout);

    if (err) {
      if (!res.headersSent) {
        return res.status(400).json({
          success: false,
          message: err.message || "Upload failed",
        });
      }
      return;
    }

    // ⚠️ Warn if no logo
    if (!req.files?.logo?.length) {
    } else {
    }

    // Banner is optional
    if (!req.files?.banner?.length) {
    } else {
    }

    next();
  });
};

export const handleServiceUpload = (req, res, next) => {
  // Set a longer timeout for Cloudinary uploads (60 seconds)
  const uploadTimeout = setTimeout(() => {
    if (!res.headersSent) {
      return res.status(408).json({
        success: false,
        message: "Upload timeout - Cloudinary service may be slow. Please try again.",
      });
    }
  }, 60000); // 60 second timeout

  uploadServiceImages(req, res, (err) => {
    clearTimeout(uploadTimeout);

    if (err) {
      if (!res.headersSent) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      return;
    }

    next();
  });
};
