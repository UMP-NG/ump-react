import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Payout from "../models/Payout.js";
import Notification from "../models/Notification.js";
import cloudinary from "../config/cloudinary.js";

/**
 * GET /api/seller/dashboard
 * Protected: seller
 */
export const getSellerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    
    let seller = await Seller.findOne({ user: userId }).lean();
    
    // Auto-create seller profile if it doesn't exist but user has seller role
    if (!seller && req.user.roles.includes("seller")) {
      seller = await Seller.create({
        user: userId,
        name: req.user.name || "Seller",
        storeName: req.user.sellerInfo?.storeName || `Store of ${req.user.email}`,
        businessName: req.user.sellerInfo?.businessName || "Business",
        isVerified: req.user.roles.includes("admin"),
      });
    }
    
    if (!seller) {
      logger.warn("⚠️  No seller profile and user doesn't have seller role:", userId);
      return res.status(403).json({ message: "User is not a seller" });
    }

    // 1) Products for this seller
    const products = await Product.find({ seller: userId }).lean();

    // 2) Last 10 paid/confirmed orders (exclude abandoned payment-pending orders)
    const productIds = products.map((p) => p._id);
    const lastOrders = await Order.find({
      "items.product": { $in: productIds },
      paymentStatus: { $in: ["paid", "released"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("buyer", "name email")
      .lean();

    // 3) Sales aggregated by product (units sold, revenue)
    const salesByProduct = await Order.aggregate([
      {
        $match: { "items.product": { $in: productIds }, paymentStatus: { $in: ["paid", "released"] } },
      },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { unitsSold: -1 } },
    ]);

    // build productMap for quick lookup
    const productMap = {};
    products.forEach((p) => (productMap[p._id.toString()] = p));

    const productPerformance = salesByProduct.map((s) => {
      const pid = String(s._id);
      const p = productMap[pid] || null;
      const variantStock = Array.isArray(p?.variants)
        ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : 0;
      const totalStock = (p?.stock || 0) + variantStock;
      return {
        productId: pid,
        name: p?.name || "Unknown",
        image: (p?.images && p.images[0]) || p?.image || "",
        unitsSold: s.unitsSold || 0,
        revenue: s.revenue || 0,
        stock: totalStock,
        views: p?.views || 0,
      };
    });

    // low stock products
    const lowStock = products
      .map((p) => {
        const variantStock = Array.isArray(p.variants)
          ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
          : 0;
        const stock = (p.stock || 0) + variantStock;
        return {
          id: p._id,
          name: p.name,
          stock,
          image: (p.images && p.images[0]) || p.image || "",
        };
      })
      .filter((x) => x.stock <= 5)
      .slice(0, 10);

    // inventory value
    const inventoryValue = products.reduce((sum, p) => {
      const variantStock = Array.isArray(p.variants)
        ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
        : 0;
      const stock = (p.stock || 0) + variantStock;
      const price = p.price || 0;
      return sum + price * stock;
    }, 0);

    // revenue totals
    const revenueAgg = await Order.aggregate([
      {
        $match: { "items.product": { $in: productIds }, paymentStatus: { $in: ["paid", "released"] } },
      },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // recent payouts
    const recentPayouts = await Payout.find({ seller: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // simple notifications (unread count)
    const notifCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });
    const notifications = { unread: notifCount };

    // weekly orders change (basic)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekOrders = await Order.countDocuments({
      "items.product": { $in: productIds },
      paymentStatus: { $in: ["paid", "released"] },
      createdAt: { $gte: weekAgo },
    });
    const lastWeekOrders = await Order.countDocuments({
      "items.product": { $in: productIds },
      paymentStatus: { $in: ["paid", "released"] },
      createdAt: { $gte: twoWeeksAgo, $lt: weekAgo },
    });
    const ordersPctChange =
      lastWeekOrders === 0
        ? thisWeekOrders === 0
          ? 0
          : 100
        : ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100;

    res.json({
      notifications,
      walletBalance: seller.pendingPayout || 0,
      profile: seller,
      kpis: {
        totalRevenue,
        inventoryValue,
        ordersThisWeek: thisWeekOrders,
        ordersPctChange,
        walletBalance: seller.pendingPayout || 0,
      },
      totals: {
        totalRevenue,
        inventoryValue,
        ordersThisWeek: thisWeekOrders,
        ordersPctChange,
      },
      recentOrders: lastOrders,
      productPerformance,
      lowStock,
      recentPayouts,
    });
  } catch (err) {
    logger.error("getSellerDashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/sellers/settings
 * Update store profile, bio, and socials
 */
export const updateSellerSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const { storeName, storeBio, description, address, instagram, tiktok, logoUrl, logoPublicId, bannerUrl, bannerPublicId } = req.body;
    const logo = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : logoUrl
      ? { url: logoUrl, publicId: logoPublicId || "" }
      : undefined;
    const banner = bannerUrl ? { url: bannerUrl, publicId: bannerPublicId || "" } : undefined;

    const seller = await Seller.findOne({ user: userId });
    if (!seller)
      return res.status(404).json({ message: "Seller profile not found" });

    if (storeName) seller.storeName = storeName;
    if (storeBio) seller.bio = storeBio;
    if (description) seller.description = description;
    if (address !== undefined) seller.address = address;
    if (instagram || tiktok) {
      seller.socials = {
        ...seller.socials,
        instagram: instagram || seller.socials?.instagram,
        tiktok: tiktok || seller.socials?.tiktok,
      };
    }
    if (logo) seller.logo = logo;
    if (banner) seller.banner = banner;

    await seller.save();
    res.json({ message: "Seller profile updated successfully.", seller });
  } catch (err) {
    logger.error("updateSellerSettings error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/notifications/preferences
 * Save notification toggle preferences
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, enabled } = req.body;

    if (!type)
      return res
        .status(400)
        .json({ message: "Notification type is required." });

    const notification = await Notification.findOneAndUpdate(
      { user: userId, type },
      { enabled },
      { new: true, upsert: true }
    );

    res.json({
      message: `Notification preference for '${type}' updated.`,
      notification,
    });
  } catch (err) {
    logger.error("updateNotificationPreferences error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/sellers/policies
 * Save return policy, shipping, and pickup zones
 */
export const updateSellerPolicies = async (req, res) => {
  try {
    const userId = req.user._id;
    const { returnPolicy, shippingRates, pickups } = req.body;

    const seller = await Seller.findOne({ user: userId });
    if (!seller)
      return res.status(404).json({ message: "Seller profile not found" });

    seller.policies = {
      returnPolicy: returnPolicy || seller.policies?.returnPolicy,
      shippingRates: shippingRates || seller.policies?.shippingRates,
      pickups: pickups || seller.policies?.pickups,
    };

    await seller.save();
    res.json({ message: "Seller policies updated successfully.", seller });
  } catch (err) {
    logger.error("updateSellerPolicies error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/users/update-password
 * Change account password
 */
import bcrypt from "bcrypt";
import User from "../models/User.js";
import logger from "../utils/logger.js";

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Old password is incorrect." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    logger.error("updatePassword error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/users/deactivate
 * Deactivate account
 */
export const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.isActive = false;
    await user.save();

    res.json({ message: "Your account has been deactivated." });
  } catch (err) {
    logger.error("deactivateAccount error:", err);
    res.status(500).json({ message: err.message });
  }
};

