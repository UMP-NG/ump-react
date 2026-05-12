import express from "express";
import Admin from "../models/Admin.js";
import { bulkImportProducts } from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/upload.js";
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllSellers,
  updateSellerStatus,
  deleteSeller,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getAllListings,
  updateListing,
  deleteListing,
  getAllServices,
  updateService,
  deleteService,
  getAllOrders,
  updateOrder,
  deleteOrder,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select("_id name email avatar")
      .lean();
    
    // Transform avatar object to match user format
    const transformedAdmins = admins.map((admin) => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      avatar: admin.avatar && admin.avatar.url ? admin.avatar.url : "/images/admin-default.png",
      role: "admin",
    }));
    
    res.json(transformedAdmins);
  } catch (err) {
    console.error("❌ Error fetching admins:", err);
    res.status(500).json({ message: "Server error fetching admins" });
  }
});

// ===============================
// Users
// ===============================
router.get("/users", protect, requireRole("admin"), getAllUsers);
router.put(
  "/users/:userId/role",
  protect,
  requireRole("admin"),
  updateUserRole
);
router.delete("/users/:userId", protect, requireRole("admin"), deleteUser);

// ===============================
// Sellers
// ===============================
router.get("/sellers", protect, requireRole("admin"), getAllSellers);
router.put(
  "/sellers/:sellerId/status",
  protect,
  requireRole("admin"),
  updateSellerStatus
);
router.delete(
  "/sellers/:sellerId",
  protect,
  requireRole("admin"),
  deleteSeller
);

// ===============================
// Products
// ===============================
router.get("/products", protect, requireRole("admin"), getAllProducts);
router.put(
  "/products/:productId",
  protect,
  requireRole("admin"),
  updateProduct
);
router.delete(
  "/products/:productId",
  protect,
  requireRole("admin"),
  deleteProduct
);

// ===============================
// Listings
// ===============================
router.get("/listings", protect, requireRole("admin"), getAllListings);
router.put(
  "/listings/:listingId",
  protect,
  requireRole("admin"),
  updateListing
);
router.delete(
  "/listings/:listingId",
  protect,
  requireRole("admin"),
  deleteListing
);

// ===============================
// Services
// ===============================
router.get("/services", protect, requireRole("admin"), getAllServices);
router.put(
  "/services/:serviceId",
  protect,
  requireRole("admin"),
  updateService
);
router.delete(
  "/services/:serviceId",
  protect,
  requireRole("admin"),
  deleteService
);

// ===============================
// Orders
// ===============================
router.get("/orders", protect, requireRole("admin"), getAllOrders);
router.put("/orders/:orderId", protect, requireRole("admin"), updateOrder);
router.delete("/orders/:orderId", protect, requireRole("admin"), deleteOrder);

router.post(
  "/import-products",
  protect,
  requireRole("admin"),
  uploadSingle,
  bulkImportProducts
);

export default router;

