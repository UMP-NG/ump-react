import express from "express";
import Admin from "../models/Admin.js";
import { bulkImportProducts, updateUserRole, deleteUser, updateProduct, deleteProduct, updateListing, deleteListing, updateService, deleteService, updateOrder, deleteOrder, updateSellerStatus, deleteSeller } from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/upload.js";
import logger from "../utils/logger.js";
import {
  getAdminStats,
  getActivityChart,
  getRecentOrders,
  getPendingVerifications,
  getAdminUsers,
  banUser,
  unbanUser,
  getAdminSellers,
  reinstateSeller,
  restrictSeller,
  getAdminOrders,
  getOrdersSummary,
  getAdminPayouts,
  getPayoutsSummary,
  approvePayout,
  getAnalytics,
  getAdminTeam,
  getAdminActivity,
  getAdminProviders,
  approveProvider,
  getAdminServices,
  getAdminProducts,
  bulkProductAction,
  getAdminBookings,
  getAdminListings,
  getAdminCategories,
  createCategory,
  updateAdminCategory,
  deleteCategory,
  getSupportAdmins,
  setSupportRole,
  getSupportTeam,
  getAdminReviews,
  deleteReview,
  getAdminReports,
  resolveReport,
  getAdminDisputes,
  resolveDispute,
  getBroadcasts,
  createBroadcast,
  deleteBroadcast,
  publicConfig,
  getConfig,
  saveConfig,
  getEvents,
  saveEvent,
  deleteEvent,
  inviteAdmin,
  getIdentityVerifications,
  approveIdentityVerification,
  rejectIdentityVerification,
} from "../controllers/adminDashboardController.js";

const router = express.Router();
const adm = [protect, requireRole("admin")];

router.get("/", ...adm, async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select("_id name avatar")
      .lean();
    res.json(admins.map((admin) => ({
      _id:    admin._id,
      name:   admin.name,
      avatar: admin.avatar?.url || "/images/admin-default.png",
      role:   "admin",
    })));
  } catch (err) {
    logger.error("❌ Error fetching admins:", err);
    res.status(500).json({ message: "Server error fetching admins" });
  }
});

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
router.post  ("/invite",                 ...adm, inviteAdmin);
router.put   ("/users/:userId/role",     ...adm, updateUserRole);
router.post  ("/users/:userId/ban",      ...adm, banUser);
router.post  ("/users/:userId/unban",    ...adm, unbanUser);
router.delete("/users/:userId",          ...adm, deleteUser);

// ── Sellers ────────────────────────────────────────────────────────────────
router.get   ("/sellers",                    ...adm, getAdminSellers);
router.post  ("/sellers/:sellerId/approve",  ...adm, reinstateSeller);
router.post  ("/sellers/:sellerId/reject",   ...adm, restrictSeller);
router.put   ("/sellers/:sellerId/status",   ...adm, updateSellerStatus);
router.delete("/sellers/:sellerId",          ...adm, deleteSeller);

// ── Orders ─────────────────────────────────────────────────────────────────
router.get   ("/orders/summary",    ...adm, getOrdersSummary);
router.get   ("/orders",            ...adm, getAdminOrders);
router.put   ("/orders/:orderId",   ...adm, updateOrder);
router.delete("/orders/:orderId",   ...adm, deleteOrder);

// ── Bookings ───────────────────────────────────────────────────────────────
router.get("/bookings", ...adm, getAdminBookings);

// ── Payouts ────────────────────────────────────────────────────────────────
router.get ("/payouts/summary",            ...adm, getPayoutsSummary);
router.get ("/payouts",                    ...adm, getAdminPayouts);
router.post("/payouts/:payoutId/approve",  ...adm, approvePayout);

// ── Providers ─────────────────────────────────────────────────────────────
router.get ("/providers",                      ...adm, getAdminProviders);
router.post("/providers/:userId/approve",      ...adm, approveProvider);

// ── Products ───────────────────────────────────────────────────────────────
router.get   ("/products",             ...adm, getAdminProducts);
router.post  ("/products/bulk",        ...adm, bulkProductAction);
router.put   ("/products/:productId",  ...adm, updateProduct);
router.delete("/products/:productId",  ...adm, deleteProduct);

// ── Reviews ────────────────────────────────────────────────────────────────
router.get   ("/reviews",            ...adm, getAdminReviews);
router.delete("/reviews/:reviewId",  ...adm, deleteReview);

// ── Reported content ───────────────────────────────────────────────────────
router.get ("/reports",                      ...adm, getAdminReports);
router.post("/reports/:reportId/resolve",    ...adm, resolveReport);

// ── Disputes ───────────────────────────────────────────────────────────────
router.get ("/disputes",                      ...adm, getAdminDisputes);
router.post("/disputes/:disputeId/resolve",   ...adm, resolveDispute);

// ── Identity Verifications ─────────────────────────────────────────────────
router.get  ("/identity-verifications",               ...adm, getIdentityVerifications);
router.post ("/identity-verifications/:id/approve",   ...adm, approveIdentityVerification);
router.post ("/identity-verifications/:id/reject",    ...adm, rejectIdentityVerification);

// ── Broadcasts ─────────────────────────────────────────────────────────────
router.get   ("/broadcasts",                  ...adm, getBroadcasts);
router.post  ("/broadcasts",                  ...adm, createBroadcast);
router.delete("/broadcasts/:broadcastId",     ...adm, deleteBroadcast);

// ── Config ─────────────────────────────────────────────────────────────────
router.get("/config/public", publicConfig); // logo + slides only — safe for unauthenticated callers
router.get("/config", ...adm, getConfig);  // full config — admin only
router.put("/config", ...adm, saveConfig);

// ── Events / holiday sections ───────────────────────────────────────────────
router.get   ("/events",              ...adm, getEvents);
router.post  ("/events",              ...adm, saveEvent);
router.put   ("/events/:eventId",     ...adm, saveEvent);
router.delete("/events/:eventId",     ...adm, deleteEvent);

// ── Listings ───────────────────────────────────────────────────────────────
router.get   ("/listings",                ...adm, getAdminListings);
router.put   ("/listings/:listingId",     ...adm, updateListing);
router.delete("/listings/:listingId",     ...adm, deleteListing);

// ── Categories ─────────────────────────────────────────────────────────────
router.get   ("/categories",              ...adm, getAdminCategories);
router.post  ("/categories",              ...adm, createCategory);
router.put   ("/categories/:categoryId",  ...adm, updateAdminCategory);
router.delete("/categories/:categoryId",  ...adm, deleteCategory);

// ── Support roles ──────────────────────────────────────────────────────────
router.get ("/support/team",                    protect, getSupportTeam); // requires login
router.get ("/support/admins",                  ...adm, getSupportAdmins);
router.put ("/support/admins/:userId/role",     ...adm, setSupportRole);

// ── Services ───────────────────────────────────────────────────────────────
router.get   ("/services",             ...adm, getAdminServices);
router.put   ("/services/:serviceId",  ...adm, updateService);
router.delete("/services/:serviceId",  ...adm, deleteService);

// ── Bulk import ────────────────────────────────────────────────────────────
router.post("/import-products", ...adm, uploadSingle, bulkImportProducts);

export default router;

