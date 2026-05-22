import express from "express";
import Admin from "../models/Admin.js";
import { bulkImportProducts, updateUserRole, deleteUser, updateProduct, deleteProduct, updateListing, deleteListing, updateService, deleteService, updateOrder, deleteOrder, updateSellerStatus } from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/upload.js";
import {
  getAdminStats,
  getActivityChart,
  getRecentOrders,
  getPendingVerifications,
  getAdminUsers,
  banUser,
  unbanUser,
  getAdminSellers,
  approveSeller,
  rejectSeller,
  getAdminOrders,
  getOrdersSummary,
  getAdminPayouts,
  getPayoutsSummary,
  approvePayout,
  getAnalytics,
  getAdminTeam,
  getAdminActivity,
  getAdminProviders,
  getAdminProducts,
  bulkProductAction,
  getAdminDisputes,
  resolveDispute,
  getBroadcasts,
  createBroadcast,
  getConfig,
  saveConfig,
} from "../controllers/adminDashboardController.js";

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

const adm = [protect, requireRole("admin")];

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get("/stats",                  ...adm, getAdminStats);
router.get("/activity-chart",         ...adm, getActivityChart);
router.get("/recent-orders",          ...adm, getRecentOrders);
router.get("/pending-verifications",  ...adm, getPendingVerifications);
router.get("/analytics",              ...adm, getAnalytics);

// ── Team & Activity ────────────────────────────────────────────────────────
router.get("/team",     ...adm, getAdminTeam);
router.get("/activity", ...adm, getAdminActivity);

// ── Users ──────────────────────────────────────────────────────────────────
router.get   ("/users",                  ...adm, getAdminUsers);
router.put   ("/users/:userId/role",     ...adm, updateUserRole);
router.post  ("/users/:userId/ban",      ...adm, banUser);
router.post  ("/users/:userId/unban",    ...adm, unbanUser);
router.delete("/users/:userId",          ...adm, deleteUser);

// ── Sellers ────────────────────────────────────────────────────────────────
router.get   ("/sellers",                    ...adm, getAdminSellers);
router.post  ("/sellers/:sellerId/approve",  ...adm, approveSeller);
router.post  ("/sellers/:sellerId/reject",   ...adm, rejectSeller);
router.put   ("/sellers/:sellerId/status",   ...adm, updateSellerStatus);

// ── Orders ─────────────────────────────────────────────────────────────────
router.get   ("/orders/summary",    ...adm, getOrdersSummary);
router.get   ("/orders",            ...adm, getAdminOrders);
router.put   ("/orders/:orderId",   ...adm, updateOrder);
router.delete("/orders/:orderId",   ...adm, deleteOrder);

// ── Payouts ────────────────────────────────────────────────────────────────
router.get ("/payouts/summary",            ...adm, getPayoutsSummary);
router.get ("/payouts",                    ...adm, getAdminPayouts);
router.post("/payouts/:payoutId/approve",  ...adm, approvePayout);

// ── Providers ─────────────────────────────────────────────────────────────
router.get("/providers", ...adm, getAdminProviders);

// ── Products ───────────────────────────────────────────────────────────────
router.get   ("/products",             ...adm, getAdminProducts);
router.post  ("/products/bulk",        ...adm, bulkProductAction);
router.put   ("/products/:productId",  ...adm, updateProduct);
router.delete("/products/:productId",  ...adm, deleteProduct);

// ── Disputes ───────────────────────────────────────────────────────────────
router.get ("/disputes",                      ...adm, getAdminDisputes);
router.post("/disputes/:disputeId/resolve",   ...adm, resolveDispute);

// ── Broadcasts ─────────────────────────────────────────────────────────────
router.get ("/broadcasts", ...adm, getBroadcasts);
router.post("/broadcasts", ...adm, createBroadcast);

// ── Config ─────────────────────────────────────────────────────────────────
router.get("/config", getConfig);          // public — needed for logo on frontend
router.put("/config", ...adm, saveConfig);

// ── Listings ───────────────────────────────────────────────────────────────
router.put   ("/listings/:listingId",  ...adm, updateListing);
router.delete("/listings/:listingId",  ...adm, deleteListing);

// ── Services ───────────────────────────────────────────────────────────────
router.put   ("/services/:serviceId",  ...adm, updateService);
router.delete("/services/:serviceId",  ...adm, deleteService);

// ── Bulk import ────────────────────────────────────────────────────────────
router.post("/import-products", ...adm, uploadSingle, bulkImportProducts);

export default router;

