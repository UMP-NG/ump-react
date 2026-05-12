import express from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  getMyServices,
  becomeServiceProvider,
  requestServiceVerification,
} from "../controllers/serviceController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadServiceImages } from "../middleware/upload.js";

const router = express.Router();

// Public
router.get("/mine", protect, getMyServices);

router.post(
  "/becomeServiceProvider",
  protect,
  uploadServiceImages,
  becomeServiceProvider
);

router.post("/request-verification", protect, requestServiceVerification);

router.get("/", getAllServices);
router.get("/:id", getServiceById);

// Protected (service_provider + admin)
router.post(
  "/",
  protect,
  requireRole("service_provider", "admin"),
  uploadServiceImages,
  createService
);
router.put(
  "/:id",
  protect,
  requireRole("service_provider", "admin"),
  uploadServiceImages,
  updateService
);
router.delete(
  "/:id",
  protect,
  requireRole("service_provider", "admin"),
  deleteService
);

export default router;
