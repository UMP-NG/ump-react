import express from "express";
import {
  listSections,
  listSectionsAdmin,
  listSectionsWithProducts,
  createSection,
  updateSection,
  deleteSection,
  addProductsToSection,
  removeProductFromSection,
} from "../controllers/sectionController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", listSections);
router.get("/with-products", listSectionsWithProducts);

// Admin
router.get("/admin", protect, requireRole("admin"), listSectionsAdmin);
router.post("/", protect, requireRole("admin"), createSection);
router.put("/:id", protect, requireRole("admin"), updateSection);
router.delete("/:id", protect, requireRole("admin"), deleteSection);
router.put("/:id/products", protect, requireRole("admin"), addProductsToSection);
router.delete("/:id/products/:productId", protect, requireRole("admin"), removeProductFromSection);

export default router;
