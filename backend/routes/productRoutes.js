// productRoutes.js
import express from "express";
import { protect, requireRole, optionalAuth } from "../middleware/authMiddleware.js";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAdvertisedProducts,
  filterAndSortProducts,
  getRelatedProducts,
  getMyProducts,
  trackProductView,
  getProductsByCategory,
  toggleRestockAlert,
  togglePriceWatch,
  getFollowingFeed,
} from "../controllers/productController.js";
import { uploadListingMedia } from "../middleware/upload.js"; // ✅ Use single config

const router = express.Router();

// ⚠️ IMPORTANT: Specific routes MUST come before dynamic /:id route
// Otherwise "/my" will be caught by "/:id" matcher

// ------------------------------
// 🌍 Public Routes (specific before dynamic)
// ------------------------------
router.get("/advertised", getAdvertisedProducts);
router.get("/filter", filterAndSortProducts);
router.get("/category/:categoryId", getProductsByCategory);

// ------------------------------
// 🛒 Seller-only Routes
// ------------------------------
router.get("/my", protect, requireRole("seller"), getMyProducts);
router.get("/following", protect, getFollowingFeed);

// ------------------------------
// 🛒 Protected Create/Update/Delete Routes
// ------------------------------
router.post(
  "/",
  protect,
  requireRole("seller", "admin"),
  uploadListingMedia,
  createProduct
);

router.put(
  "/:id",
  protect,
  requireRole("seller", "admin"),
  uploadListingMedia,
  updateProduct
);

router.delete("/:id", protect, requireRole("seller", "admin"), deleteProduct);

router.post("/:id/view", optionalAuth, trackProductView);
router.get("/:id/related", getRelatedProducts);
router.post("/:id/notify-restock", protect, toggleRestockAlert);
router.post("/:id/watch-price", protect, togglePriceWatch);

// 🧩 Dynamic route (MUST be last)
router.get("/", getAllProducts);
router.get("/:id", optionalAuth, getProductById);

export default router;

