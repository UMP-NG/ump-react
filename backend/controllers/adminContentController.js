import mongoose from "mongoose";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Listing from "../models/Listing.js";
import Category from "../models/Category.js";
import Seller from "../models/Seller.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

export const getAdminProducts = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status } = req.query;
    const filter = {};
    if (status === "flagged")      filter.isFlagged = true;
    else if (status === "removed") filter.isRemoved = true;
    else if (status === "active")  { filter.isFlagged = { $ne: true }; filter.isRemoved = { $ne: true }; }
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("seller","name").populate("category","name").lean(),
      Product.countDocuments(filter),
    ]);
    const sellerUserIds = [...new Set(products.map((p) => p.seller?._id).filter(Boolean))];
    const sellerDocs    = sellerUserIds.length ? await Seller.find({ user: { $in: sellerUserIds } }).select("user storeName").lean() : [];
    const storeMap      = Object.fromEntries(sellerDocs.map((s) => [s.user.toString(), s.storeName]));
    const shaped = products.map((p) => ({
      ...p,
      seller:   p.seller ? { ...p.seller, storeName: storeMap[p.seller._id?.toString()] || p.seller.name } : null,
      category: p.category?.name || p.category || "—",
      status:   p.isRemoved ? "removed" : p.isFlagged ? "flagged" : "active",
    }));
    res.json({ products: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminProducts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const bulkProductAction = async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "No IDs provided" });
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validIds.length) return res.status(400).json({ message: "Invalid IDs" });
    const update =
      action === "flag"    ? { isFlagged: true } :
      action === "feature" ? { isAdvertised: true } :
      action === "remove"  ? { isRemoved: true, isAvailable: false } : null;
    if (!update) return res.status(400).json({ message: "Invalid action" });
    await Product.updateMany({ _id: { $in: validIds } }, update);
    res.json({ success: true });
  } catch (err) {
    logger.error("bulkProductAction:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminServices = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status, q } = req.query;
    const filter = {};
    if (status === "verified") filter.verified = true;
    if (status === "pending")  { filter.verified = false; filter.verificationRequested = true; }
    if (status === "suspended") {
      const suspended = await User.find({ status: "banned", roles: "service_provider" }).select("_id").lean();
      filter.provider = { $in: suspended.map((u) => u._id) };
    }
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: { $regex: safe, $options: "i" } }, { major: { $regex: safe, $options: "i" } }];
    }
    const [services, total] = await Promise.all([
      Service.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("provider","name email status").lean(),
      Service.countDocuments(filter),
    ]);
    const shaped = services.map((s) => {
      const isSuspended = s.provider?.status === "banned";
      const verSt = isSuspended ? "suspended" : s.verified ? "verified" : s.verificationRequested ? "pending" : "pending";
      return { _id: s._id, name: s.name, title: s.title || "", image: s.images?.[0]?.url || null, category: s.major || "", rate: s.rate || 0, currency: s.currency || "NGN", rating: s.rating || 0, reviewsCount: s.reviewsCount || 0, description: s.about || s.desc || "", certifications: s.certifications || [], verificationStatus: verSt, provider: { _id: s.provider?._id, name: s.provider?.name || "—", email: s.provider?.email || "" }, createdAt: s.createdAt };
    });
    res.json({ services: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminServices:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminBookings = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("user", "name email avatar").populate("provider", "name email")
        .populate({ path: "item", select: "name title type rate" }).lean(),
      Booking.countDocuments(filter),
    ]);
    const statusCounts = await Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const shaped = bookings.map((b) => ({
      _id: b._id,
      user:     { _id: b.user?._id, name: b.user?.name || "—", email: b.user?.email || "—", avatar: b.user?.avatar?.url || null },
      provider: { _id: b.provider?._id, name: b.provider?.name || "—", email: b.provider?.email || "—" },
      item:     { name: b.item?.name || b.item?.title || "—", type: b.itemModel },
      date: b.date, timeSlot: b.timeSlot, notes: b.notes || "", status: b.status, createdAt: b.createdAt,
    }));
    res.json({ bookings: shaped, total, page, summary: countMap });
  } catch (err) {
    logger.error("getAdminBookings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminListings = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { type, q } = req.query;
    const filter = {};
    if (type === "apartment")   filter.type = "Apartment";
    if (type === "hostel")      filter.type = "Hostel";
    if (type === "unavailable") filter.available = false;
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: { $regex: safe, $options: "i" } }, { location: { $regex: safe, $options: "i" } }];
    }
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("owner","name email").lean(),
      Listing.countDocuments(filter),
    ]);
    const shaped = listings.map((l) => ({
      _id: l._id, name: l.name, type: l.type, location: l.location, price: l.price, rate: l.rate || "per Year",
      beds: l.beds ?? 1, baths: l.baths ?? 1, available: l.available !== false, furnished: l.furnished || false,
      distance: l.distance || "", amenities: l.amenities || [], image: l.images?.[0]?.url || null,
      description: l.description || "", ownerName: l.owner?.name || "—", ownerEmail: l.owner?.email || "",
      reviewCount: l.reviews?.length || 0, createdAt: l.createdAt,
    }));
    res.json({ listings: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminListings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminCategories = async (req, res) => {
  try {
    const [cats, productCounts] = await Promise.all([
      Category.find().sort({ name: 1 }).populate("subcategories","name slug").lean(),
      Product.aggregate([{ $match: { category: { $exists: true, $ne: null } } }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);
    const prodMap = Object.fromEntries(productCounts.map((p) => [p._id?.toString(), p.count]));
    const shaped  = cats.map((c) => {
      const subs = (c.subcategories || []).filter(Boolean);
      return { _id: c._id, name: c.name, slug: c.slug, description: c.description || "", image: c.images?.[0]?.url || null, subcategories: subs.map((s) => ({ _id: s._id, name: s.name, slug: s.slug })), subcategoryCount: subs.length, productCount: prodMap[c._id.toString()] || 0, createdAt: c.createdAt };
    });
    res.json({ categories: shaped, total: shaped.length });
  } catch (err) {
    logger.error("getAdminCategories:", err);
    res.status(500).json({ message: "Server error" });
  }
};

function validateCategoryImageUrl(url) {
  if (!url) return null;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const valid = cloud
    ? new RegExp(`^https://res\\.cloudinary\\.com/${cloud}/`, "i")
    : /^https:\/\/res\.cloudinary\.com\//i;
  return valid.test(url) ? null : "Image must be uploaded through UMP's upload service";
}

export const createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl, imagePublicId } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    const imgErr = validateCategoryImageUrl(imageUrl);
    if (imgErr) return res.status(400).json({ message: imgErr });
    const slug   = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const images = imageUrl ? [{ url: imageUrl, publicId: imagePublicId || "" }] : [];
    const cat    = await Category.create({ name, slug, description, images });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Category already exists" });
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAdminCategory = async (req, res) => {
  try {
    const { name, description, imageUrl, imagePublicId } = req.body;
    if (imageUrl !== undefined) {
      const imgErr = validateCategoryImageUrl(imageUrl);
      if (imgErr) return res.status(400).json({ message: imgErr });
    }
    const updates = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    if (description !== undefined) updates.description = description;
    if (imageUrl !== undefined) {
      updates.images = imageUrl ? [{ url: imageUrl, publicId: imagePublicId || "" }] : [];
    }
    const cat = await Category.findByIdAndUpdate(req.params.categoryId, updates, { new: true });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "That category name already exists" });
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.categoryId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
