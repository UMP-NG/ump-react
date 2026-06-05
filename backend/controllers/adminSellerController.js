import Seller from "../models/Seller.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import logger from "../utils/logger.js";
import { startOf, sellerStatus } from "./adminHelpers.js";

export const getAdminSellers = async (req, res) => {
  try {
    const { status, q } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const filter = {};
    if (status === "subscribed") { filter.isSubscribed = true;  filter.isSuspended = { $ne: true }; }
    if (status === "pending")   { filter.isSubscribed = false; filter.isSuspended = { $ne: true }; }
    if (status === "suspended") { filter.isSuspended = true; }
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ storeName: { $regex: safe, $options: "i" } }, { name: { $regex: safe, $options: "i" } }];
    }
    const thirty = startOf(30);
    const [sellers, total] = await Promise.all([
      Seller.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user","name email phone").lean(),
      Seller.countDocuments(filter),
    ]);
    const userIds = sellers.map((s) => s.user?._id).filter(Boolean);
    const [rev30, prodCounts] = await Promise.all([
      Order.aggregate([{ $match: { seller: { $in: userIds }, status: "completed", createdAt: { $gte: thirty } } }, { $group: { _id: "$seller", total: { $sum: "$totalAmount" } } }]),
      Product.aggregate([{ $match: { seller: { $in: userIds } } }, { $group: { _id: "$seller", count: { $sum: 1 } } }]),
    ]);
    const revMap  = Object.fromEntries(rev30.map((r)    => [r._id.toString(), r.total]));
    const prodMap = Object.fromEntries(prodCounts.map((p) => [p._id.toString(), p.count]));
    const OID_RE = /^[a-f\d]{24}$/i;
    const catIds = [...new Set(sellers.flatMap((s) => (s.category || []).filter((c) => OID_RE.test(c))))];
    const catDocs = catIds.length ? await Category.find({ _id: { $in: catIds } }).select("name").lean() : [];
    const catNameMap = Object.fromEntries(catDocs.map((c) => [c._id.toString(), c.name]));
    const resolveCategory = (cats) => (Array.isArray(cats) ? cats : cats ? [cats] : []).map((c) => catNameMap[c] || c).filter(Boolean).join(", ");
    const shaped = sellers.map((s) => ({
      _id: s._id, userId: s.user?._id || null, storeName: s.storeName || s.businessName || s.name,
      ownerName: s.user?.name || s.name, email: s.user?.email || "", phone: s.phone || s.user?.phone || "",
      logo: s.logo?.url || s.avatar?.url || null, banner: s.banner?.url || null,
      category: resolveCategory(s.category), description: s.description || s.bio || "",
      location: s.location || s.address || "",
      productCount: prodMap[s.user?._id?.toString()] ?? s.totalProducts ?? 0,
      revenue30d: revMap[s.user?._id?.toString()] ?? 0,
      totalRevenue: s.totalRevenue || 0, totalOrders: s.totalOrders || 0, averageRating: s.rating || 0,
      verificationStatus: sellerStatus(s), bankDetails: s.bankDetails || null, story: s.story || "", createdAt: s.createdAt,
    }));
    res.json({ sellers: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminSellers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const approveSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    seller.isSubscribed = true; seller.subscriptionRequested = false; seller.isSuspended = false;
    await seller.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const rejectSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    if (seller.isSubscribed) { seller.isSuspended = true; } else { seller.subscriptionRequested = false; }
    seller.isSubscribed = false;
    await seller.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
