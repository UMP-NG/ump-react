import express from "express";
import Category from "../models/Category.js";
import {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  listSubcategories,
  updateSubcategory,
  deleteSubcategory,
} from "../controllers/categoryController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ✅ Category Routes */
router.post("/", protect, requireRole("admin"), createCategory);
router.get("/", listCategories);

/* ✅ Subcategory Routes — BEFORE any :id routes */
router.post("/sub", protect, requireRole("admin"), createSubcategory);
router.get("/sub", listSubcategories);
router.put("/sub/:id", protect, requireRole("admin"), updateSubcategory);
router.delete("/sub/:id", protect, requireRole("admin"), deleteSubcategory);

/* ✅ Slug route also before :id routes */
router.get("/slug/:slug", async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json(category);
});

/* ✅ Category ID routes — keep these LAST */
router.get("/:id", getCategory);
router.put("/:id", protect, requireRole("admin"), updateCategory);
router.delete("/:id", protect, requireRole("admin"), deleteCategory);

export default router;
