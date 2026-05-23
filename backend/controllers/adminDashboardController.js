import mongoose from "mongoose";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Order from "../models/Order.js";
import Payout from "../models/Payout.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Category from "../models/Category.js";
import Listing from "../models/Listing.js";
import Subcategory from "../models/Subcategory.js";
import Review from "../models/Review.js";
import Report from "../models/Report.js";
import AuditLog from "../models/AuditLog.js";
import Broadcast from "../models/Broadcast.js";
import Config from "../models/Config.js";
import Admin from "../models/Admin.js";
import Notification from "../models/Notification.js";
import { notify } from "../utils/notify.js";
import PushSub from "../models/PushSub.js";
import { sendPushToSubs } from "./pushController.js";

// ─── Server-side response cache ─────────────────────────────────────────────
// Caches expensive aggregation results in memory for a short TTL.
// This is the biggest single latency win on Atlas M0 free tier.
const _sCache = new Map(); // key → { data, ts }

function scGet(key, ttlMs) {
  const e = _sCache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data;
  return null;
}
function scSet(key, data) { _sCache.set(key, { data, ts: Date.now() }); }

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n || isNaN(n)) return "₦0";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
};

const startOf = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Derive a readable seller verification status from boolean fields
const sellerStatus = (s) => {
  if (s.isSuspended) return "suspended";
  if (s.isVerified)  return "verified";
  return "pending";
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
export const getAdminStats = async (req, res) => {
  const VALID_DAYS = [1, 7, 30, 365, 1825];
  const days = VALID_DAYS.includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 30;

  const cached = scGet(`stats:${days}`, 60_000); // 60 s per period
  if (cached) return res.json(cached);

  try {
    const since = startOf(days);

    const [
      newUsers,
      totalUsers,
      newSellers,
      totalSellers,
      pendingSellers,
      orderAgg,
      payoutAgg,
      disputes,
    ] = await Promise.all([
      // Period-specific counts
      User.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments(),
      Seller.countDocuments({ createdAt: { $gte: since } }),
      Seller.countDocuments(),
      Seller.countDocuments({ isVerified: false, verificationRequested: true }),

      Order.aggregate([
        {
          $facet: {
            // Always-current: orders in flight right now
            active: [
              { $match: { status: { $in: ["pending", "confirmed", "shipped"] } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
            // Period-specific: all orders placed in window
            period: [
              { $match: { createdAt: { $gte: since } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
            ],
            // Period-specific: completed order revenue → platform fee
            revenue: [
              { $match: { status: "completed", createdAt: { $gte: since } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
          },
        },
      ]),

      // Always-current pending payouts
      Payout.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),

      Order.countDocuments({ status: "disputed" }),
    ]);

    const activeVal    = orderAgg[0]?.active[0]?.total   || 0;
    const periodGMV    = orderAgg[0]?.period[0]?.total   || 0;
    const periodCount  = orderAgg[0]?.period[0]?.count   || 0;
    const periodRev    = orderAgg[0]?.revenue[0]?.total  || 0;
    const payoutVal    = payoutAgg[0]?.total  || 0;
    const payoutCount  = payoutAgg[0]?.count  || 0;

    const result = {
      days,
      // Period-aware KPIs
      newUsers,
      newSellers,
      periodOrdersValue: fmt(periodGMV),
      periodOrderCount:  periodCount,
      platformRevenue:   fmt(periodRev * 0.032),
      // Always-current KPIs
      totalUsers,
      totalSellers,
      pendingSellers,
      activeOrdersValue:   fmt(activeVal),
      pendingPayoutsValue: fmt(payoutVal),
      pendingPayoutsCount: payoutCount,
      flaggedCount:        disputes,
      disputes,
      reports: 0,
    };
    scSet(`stats:${days}`, result);
    res.json(result);
  } catch (err) {
    console.error("getAdminStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ACTIVITY CHART (daily or monthly orders / revenue / new users) ──────────
export const getActivityChart = async (req, res) => {
  const VALID_DAYS = [1, 7, 30, 365, 1825];
  const days = VALID_DAYS.includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 30;
  const chartCached = scGet(`chart:${days}`, 120_000); // 2 min server-side cache per period
  if (chartCached) return res.json(chartCached);

  try {
    const since = startOf(days);

    // Use monthly buckets for periods > 30 days to keep data points manageable
    const monthly   = days > 30;
    const fmt       = monthly ? "%Y-%m" : "%Y-%m-%d";

    const [orderBuckets, userBuckets] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, users: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const orderMap = Object.fromEntries(orderBuckets.map((d) => [d._id, d]));
    const userMap  = Object.fromEntries(userBuckets.map((d)  => [d._id, d.users]));

    const orders = [], revenue = [], users = [], labels = [];

    if (monthly) {
      const months = days === 365 ? 12 : 60; // 1y = 12 mo, 5y = 60 mo
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        orders.push(orderMap[key]?.orders  || 0);
        revenue.push(orderMap[key]?.revenue || 0);
        users.push(userMap[key]            || 0);
        labels.push(key);
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const key = startOf(i).toISOString().slice(0, 10);
        orders.push(orderMap[key]?.orders  || 0);
        revenue.push(orderMap[key]?.revenue || 0);
        users.push(userMap[key]            || 0);
        labels.push(key);
      }
    }

    const chartResult = { orders, revenue, users, labels };
    scSet(`chart:${days}`, chartResult);
    res.json(chartResult);
  } catch (err) {
    console.error("getActivityChart:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── RECENT ORDERS ───────────────────────────────────────────────────────────
export const getRecentOrders = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("buyer", "name email")
      .populate("seller", "storeName")
      .lean();

    // Derive a human-readable reference — Order schema has no orderRef field,
    // so we use the Paystack/payment reference or fall back to the last 6 chars of _id.
    const shaped = orders.map((o) => ({
      ...o,
      orderRef: o.paymentInfo?.reference || `UMP-${o._id.toString().slice(-6).toUpperCase()}`,
    }));

    res.json(shaped);
  } catch (err) {
    console.error("getRecentOrders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PENDING VERIFICATIONS ───────────────────────────────────────────────────
export const getPendingVerifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 4, 20);
    const sellers = await Seller.find({ isVerified: false, verificationRequested: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name email")
      .lean();

    const results = sellers.map((s) => ({
      _id:        s._id,
      name:       s.storeName || s.name,
      email:      s.user?.email || "",
      type:       "seller",
      createdAt:  s.createdAt,
    }));

    res.json(results);
  } catch (err) {
    console.error("getPendingVerifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── USERS (paginated, filtered, searchable) ─────────────────────────────────
export const getAdminUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const { role, q } = req.query;

    const filter = {};
    if (role) filter.roles = role;
    if (q) {
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name:  { $regex: safeQ, $options: "i" } },
        { email: { $regex: safeQ, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -otp -otpExpire -resetPasswordToken -resetPasswordExpire")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Normalise to fields the frontend expects
    const shaped = users.map((u) => ({
      ...u,
      isBlocked:     u.status === "banned",
      isSuspended:   u.status === "inactive",
      emailVerified: u.isVerified,
      orderCount:    u.orders?.length || 0,
    }));

    res.json({ users: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminUsers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── BAN / UNBAN USER ────────────────────────────────────────────────────────
export const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.roles.includes("admin")) return res.status(403).json({ message: "Cannot ban an admin" });
    user.status = "banned";
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.status = "active";
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── SELLERS (filtered, searchable) ──────────────────────────────────────────
export const getAdminSellers = async (req, res) => {
  try {
    const { status, q } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (status === "verified")  { filter.isVerified = true; filter.isSuspended = { $ne: true }; }
    if (status === "pending")   { filter.isVerified = false; filter.isSuspended = { $ne: true }; }
    if (status === "suspended") { filter.isSuspended = true; }
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { storeName: { $regex: safe, $options: "i" } },
        { name:      { $regex: safe, $options: "i" } },
      ];
    }

    const thirty = startOf(30);

    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email phone")
        .lean(),
      Seller.countDocuments(filter),
    ]);

    // Attach 30-day revenue and product count for each seller
    const sellerIds = sellers.map((s) => s._id);
    const userIds   = sellers.map((s) => s.user?._id).filter(Boolean);

    const [rev30, prodCounts] = await Promise.all([
      Order.aggregate([
        { $match: { seller: { $in: userIds }, status: "completed", createdAt: { $gte: thirty } } },
        { $group: { _id: "$seller", total: { $sum: "$totalAmount" } } },
      ]),
      // Product.seller refs User, so match by userIds not sellerIds
      Product.aggregate([
        { $match: { seller: { $in: userIds } } },
        { $group: { _id: "$seller", count: { $sum: 1 } } },
      ]),
    ]);

    const revMap  = Object.fromEntries(rev30.map((r)    => [r._id.toString(), r.total]));
    const prodMap = Object.fromEntries(prodCounts.map((p) => [p._id.toString(), p.count]));

    // Resolve category values that are stored as Category ObjectIds
    const OID_RE = /^[a-f\d]{24}$/i;
    const catIds = [...new Set(sellers.flatMap((s) => (s.category || []).filter((c) => OID_RE.test(c))))];
    const catDocs = catIds.length
      ? await Category.find({ _id: { $in: catIds } }).select("name").lean()
      : [];
    const catNameMap = Object.fromEntries(catDocs.map((c) => [c._id.toString(), c.name]));
    const resolveCategory = (cats) =>
      (Array.isArray(cats) ? cats : cats ? [cats] : [])
        .map((c) => catNameMap[c] || c)
        .filter(Boolean)
        .join(", ");

    const shaped = sellers.map((s) => ({
      _id:                s._id,
      userId:             s.user?._id || null,
      storeName:          s.storeName || s.businessName || s.name,
      ownerName:          s.user?.name  || s.name,
      email:              s.user?.email || "",
      phone:              s.phone || s.user?.phone || "",
      logo:               s.logo?.url || s.avatar?.url || null,
      banner:             s.banner?.url || null,
      category:           resolveCategory(s.category),
      description:        s.description || s.bio || "",
      location:           s.location || s.address || "",
      productCount:       prodMap[s.user?._id?.toString()] ?? s.totalProducts ?? 0,
      revenue30d:         revMap[s.user?._id?.toString()] ?? 0,
      totalRevenue:       s.totalRevenue || 0,
      totalOrders:        s.totalOrders  || 0,
      averageRating:      s.rating || 0,
      verificationStatus: sellerStatus(s),
      bankDetails:        s.bankDetails || null,
      story:              s.story || "",
      createdAt:          s.createdAt,
    }));

    res.json({ sellers: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminSellers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── APPROVE / REJECT SELLER ─────────────────────────────────────────────────
export const approveSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    seller.isVerified            = true;
    seller.verificationRequested = false;
    seller.isSuspended           = false;
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
    // If currently verified → suspend, otherwise → reject application
    if (seller.isVerified) {
      seller.isSuspended = true;
    } else {
      seller.verificationRequested = false;
    }
    seller.isVerified = false;
    await seller.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ORDERS (paginated, filtered) ────────────────────────────────────────────
export const getAdminOrders = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)   || 1);
    const limit  = Math.min(50,  parseInt(req.query.limit)  || 20);
    const skip   = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("buyer",  "name email avatar")
        .populate("seller", "name email")
        .populate({ path: "items.product", select: "name images price" })
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Attach storeName from Seller model if available
    const sellerUserIds = [...new Set(orders.map((o) => o.seller?._id).filter(Boolean))];
    const sellerDocs    = sellerUserIds.length
      ? await Seller.find({ user: { $in: sellerUserIds } }).select("user storeName").lean()
      : [];
    const storeMap = Object.fromEntries(sellerDocs.map((s) => [s.user.toString(), s.storeName]));

    const shaped = orders.map((o) => ({
      ...o,
      seller: o.seller
        ? { ...o.seller, storeName: storeMap[o.seller._id?.toString()] || o.seller.name || "—" }
        : null,
    }));

    res.json({ orders: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminOrders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrdersSummary = async (req, res) => {
  try {
    const counts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json({
      pending:   (map.pending   || 0) + (map["pending-verification"] || 0),
      shipped:   map.shipped    || 0,
      completed: map.completed  || 0,
      cancelled: map.cancelled  || 0,
      disputed:  map.disputed   || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PAYOUTS ─────────────────────────────────────────────────────────────────
export const getAdminPayouts = async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    const payouts = await Payout.find({ status })
      .sort({ createdAt: -1 })
      .populate("seller",   "name email")
      .populate("provider", "name email")
      .lean();

    // Attach seller store info
    const userIds = payouts.map((p) => p.seller?._id || p.provider?._id).filter(Boolean);
    const sellers = userIds.length
      ? await Seller.find({ user: { $in: userIds } }).select("user storeName bankDetails pendingPayout").lean()
      : [];
    const sellerMap = Object.fromEntries(sellers.map((s) => [s.user.toString(), s]));

    const shaped = payouts.map((p) => {
      const uid  = p.seller?._id?.toString() || p.provider?._id?.toString();
      const sDoc = uid ? sellerMap[uid] : null;
      const acct = p.accountDetails || sDoc?.bankDetails || {};
      return {
        _id:              p._id,
        seller: {
          storeName: sDoc?.storeName || p.seller?.name || p.provider?.name || "—",
          ownerName: p.seller?.name  || p.provider?.name || "—",
        },
        bankName:          acct.bankName       || "—",
        accountNumber:     acct.accountNumber  || "",
        availableBalance:  sDoc?.pendingPayout || 0,
        requestedAmount:   p.amount,
        netAmount:         Math.floor(p.amount * 0.968),
        status:            p.status,
        riskLevel:         p.amount > 500_000 ? "High" : p.amount > 100_000 ? "Medium" : "Low",
        createdAt:         p.createdAt,
      };
    });

    res.json({ payouts: shaped });
  } catch (err) {
    console.error("getAdminPayouts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPayoutsSummary = async (req, res) => {
  try {
    const today      = startOf(0);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [pending, approvedToday, paidMonth] = await Promise.all([
      Payout.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payout.aggregate([
        { $match: { status: { $in: ["processing", "completed"] }, updatedAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payout.aggregate([
        { $match: { status: "completed", updatedAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      pendingValue:   fmt(pending[0]?.total       || 0),
      approvedToday:  fmt(approvedToday[0]?.total  || 0),
      paidThisMonth:  fmt(paidMonth[0]?.total      || 0),
      walletFloat:    fmt(pending[0]?.total        || 0),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const approvePayout = async (req, res) => {
  try {
    // Atomic check-and-update: only transitions from "pending" → "processing" once,
    // preventing double-deduction if two requests arrive simultaneously.
    const payout = await Payout.findOneAndUpdate(
      { _id: req.params.payoutId, status: "pending" },
      { $set: { status: "processing" } },
      { new: true }
    );
    if (!payout) return res.status(400).json({ message: "Payout not found or already processed" });

    if (payout.seller) {
      await Seller.findOneAndUpdate(
        { user: payout.seller },
        { $inc: { pendingPayout: -payout.amount } }
      );
      // Notify seller their payout is being processed
      notify(payout.seller, {
        type: "payout",
        title: "Payout processing",
        message: `Your payout of ${fmt(payout.amount)} is now being processed and will be sent to your bank account shortly.`,
        link: "/seller/payouts",
      });
    }

    res.json({ success: true, payout });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    const ninety  = startOf(90);
    const thirty  = startOf(30);

    const [gmvAgg, categoryAgg, topSellerAgg, repeatBuyers, totalBuyers] = await Promise.all([
      // Daily GMV for last 30 days
      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: thirty } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            gmv: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Category mix — join through products
      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: ninety } } },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "prod",
          },
        },
        { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id:   { $ifNull: ["$prod.category", "Other"] },
            total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 6 },
      ]),

      // Top sellers by GMV (90 days)
      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: ninety } } },
        {
          $group: {
            _id:    "$seller",
            orders: { $sum: 1 },
            gmv:    { $sum: "$totalAmount" },
          },
        },
        { $sort: { gmv: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "sellers",
            localField: "_id",
            foreignField: "user",
            as: "sellerDoc",
          },
        },
        { $unwind: { path: "$sellerDoc", preserveNullAndEmptyArrays: true } },
      ]),

      // Repeat buyer rate
      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: ninety } } },
        { $group: { _id: "$buyer", count: { $sum: 1 } } },
        { $group: { _id: null, repeat: { $sum: { $cond: [{ $gt: ["$count", 1] }, 1, 0] } }, total: { $sum: 1 } } },
      ]),

      // 90-day totals
      Order.aggregate([
        { $match: { status: "completed", createdAt: { $gte: ninety } } },
        { $group: { _id: null, gmv: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
    ]);

    // Build 30-day daily GMV array
    const gmvMap  = Object.fromEntries(gmvAgg.map((d) => [d._id, d.gmv]));
    const gmvDaily = [];
    for (let i = 29; i >= 0; i--) {
      gmvDaily.push(gmvMap[startOf(i).toISOString().slice(0, 10)] || 0);
    }

    // Category mix
    const catTotal = categoryAgg.reduce((s, c) => s + c.total, 0) || 1;
    const categoryMix = categoryAgg.map((c) => ({
      label: c._id || "Other",
      pct:   Math.round((c.total / catTotal) * 100),
      value: fmt(c.total).replace("₦", ""),
      v:     Math.round((c.total / catTotal) * 100),
    }));

    // Top sellers
    const topSellers = topSellerAgg.map((s) => [
      s.sellerDoc?.storeName || s.sellerDoc?.name || "Unknown",
      s.orders,
      fmt(s.gmv).replace("₦", ""),
    ]);

    const gmv90    = totalBuyers[0]?.gmv   || 0;
    const count90  = totalBuyers[0]?.count || 0;
    const repeatPct = repeatBuyers[0]
      ? ((repeatBuyers[0].repeat / (repeatBuyers[0].total || 1)) * 100).toFixed(1)
      : "0.0";

    res.json({
      gmvDaily,
      categoryMix,
      topSellers,
      gmv90d:      fmt(gmv90),
      fees90d:     fmt(gmv90 * 0.032),
      avgOrder:    fmt(count90 ? gmv90 / count90 : 0),
      repeatRate:  `${repeatPct}%`,
    });
  } catch (err) {
    console.error("getAnalytics:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ADMIN TEAM ───────────────────────────────────────────────────────────────
export const getAdminTeam = async (req, res) => {
  try {
    const admins = await User.find({ roles: "admin" })
      .select("name email avatar roles createdAt status")
      .sort({ createdAt: -1 })
      .lean();

    const shaped = admins.map((a) => ({
      _id:            a._id,
      name:           a.name,
      email:          a.email,
      avatar:         a.avatar?.url || null,
      adminRole:      "admin",
      lastActiveLabel: "—",
    }));

    res.json({ admins: shaped });
  } catch (err) {
    console.error("getAdminTeam:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ADMIN ACTIVITY LOG ───────────────────────────────────────────────────────
export const getAdminActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "name")
      .lean();

    const activity = logs.map((l) => ({
      _id:       l._id,
      adminName: l.actor?.name || "System",
      action:    l.action,
      target:    l.entity
        ? `${l.entity}${l.entityId ? ` #${l.entityId.toString().slice(-4)}` : ""}`.trim()
        : "",
      createdAt: l.createdAt,
      timeLabel: new Date(l.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    }));

    res.json({ activity });
  } catch (err) {
    console.error("getAdminActivity:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── SERVICE PROVIDERS ────────────────────────────────────────────────────────
export const getAdminProviders = async (req, res) => {
  try {
    const { status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const baseQuery = { roles: "service_provider" };
    if (status === "suspended") baseQuery.status = "banned";

    const [users, total] = await Promise.all([
      User.find(baseQuery)
        .select("name email phone createdAt status serviceProviderInfo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(baseQuery),
    ]);

    const userIds  = users.map((u) => u._id);

    const [services, bookingCounts] = await Promise.all([
      userIds.length
        ? Service.find({ provider: { $in: userIds } })
            .select("provider name major rating rate desc about certifications verified verificationRequested")
            .lean()
        : [],
      userIds.length
        ? Booking.aggregate([
            { $match: { provider: { $in: userIds } } },
            { $group: { _id: "$provider", count: { $sum: 1 } } },
          ])
        : [],
    ]);

    const svcMap     = {};
    for (const s of services) {
      const key = s.provider.toString();
      if (!svcMap[key]) svcMap[key] = s;
    }
    const bookingMap = Object.fromEntries(bookingCounts.map((b) => [b._id.toString(), b.count]));

    const shaped = users.map((u) => {
      const svc  = svcMap[u._id.toString()];
      const spInfo = u.serviceProviderInfo || {};
      const isSuspended = u.status === "banned";
      const verSt = isSuspended ? "suspended"
        : (svc?.verified || spInfo.verified) ? "verified"
        : svc?.verificationRequested         ? "pending"
        : "pending";
      return {
        _id:                u._id,
        businessName:       svc?.name || spInfo.businessName || u.name,
        email:              u.email,
        phone:              u.phone || "",
        category:           svc?.major || spInfo.skills?.[0] || "",
        rate:               svc?.rate  || spInfo.rate || 0,
        description:        svc?.about || svc?.desc || spInfo.bio || "",
        certifications:     svc?.certifications || [],
        bookingCount:       bookingMap[u._id.toString()] ?? 0,
        averageRating:      svc?.rating || 0,
        verificationStatus: verSt,
        createdAt:          u.createdAt,
        _status:            verSt,
      };
    }).filter((p) => !status || p._status === status);

    res.json({ providers: shaped, total });
  } catch (err) {
    console.error("getAdminProviders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── APPROVE / SUSPEND PROVIDER ──────────────────────────────────────────────
export const approveProvider = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Provider not found" });
    const service = await Service.findOne({ provider: user._id });
    if (service) {
      service.verified = true;
      service.verificationRequested = false;
      await service.save();
    }
    if (!user.roles.includes("service_provider")) {
      user.roles.push("service_provider");
      await user.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PRODUCTS (admin view) ────────────────────────────────────────────────────
export const getAdminProducts = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status === "flagged")       filter.isFlagged = true;
    else if (status === "removed")  filter.isRemoved = true;
    else if (status === "active")   { filter.isFlagged = { $ne: true }; filter.isRemoved = { $ne: true }; }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("seller",   "name")
        .populate("category", "name")
        .lean(),
      Product.countDocuments(filter),
    ]);

    const sellerUserIds = [...new Set(products.map((p) => p.seller?._id).filter(Boolean))];
    const sellerDocs    = sellerUserIds.length
      ? await Seller.find({ user: { $in: sellerUserIds } }).select("user storeName").lean()
      : [];
    const storeMap = Object.fromEntries(sellerDocs.map((s) => [s.user.toString(), s.storeName]));

    const shaped = products.map((p) => ({
      ...p,
      seller:   p.seller ? { ...p.seller, storeName: storeMap[p.seller._id?.toString()] || p.seller.name } : null,
      category: p.category?.name || p.category || "—",
      status:   p.isRemoved ? "removed" : p.isFlagged ? "flagged" : "active",
    }));

    res.json({ products: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminProducts:", err);
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
      action === "remove"  ? { isRemoved: true, isAvailable: false } :
      null;

    if (!update) return res.status(400).json({ message: "Invalid action" });

    await Product.updateMany({ _id: { $in: validIds } }, update);
    res.json({ success: true });
  } catch (err) {
    console.error("bulkProductAction:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── SERVICES (admin view) ────────────────────────────────────────────────────
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
      filter.$or = [
        { name:  { $regex: safe, $options: "i" } },
        { major: { $regex: safe, $options: "i" } },
      ];
    }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("provider", "name email status")
        .lean(),
      Service.countDocuments(filter),
    ]);

    const shaped = services.map((s) => {
      const isSuspended = s.provider?.status === "banned";
      const verSt = isSuspended ? "suspended"
        : s.verified             ? "verified"
        : s.verificationRequested ? "pending"
        : "pending";
      return {
        _id:                s._id,
        name:               s.name,
        title:              s.title || "",
        image:              s.images?.[0]?.url || null,
        category:           s.major || "",
        rate:               s.rate  || 0,
        currency:           s.currency || "NGN",
        rating:             s.rating || 0,
        reviewsCount:       s.reviewsCount || 0,
        description:        s.about || s.desc || "",
        certifications:     s.certifications || [],
        verificationStatus: verSt,
        provider: {
          _id:   s.provider?._id,
          name:  s.provider?.name  || "—",
          email: s.provider?.email || "",
        },
        createdAt: s.createdAt,
      };
    });

    res.json({ services: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminServices:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── BOOKINGS (admin view) ────────────────────────────────────────────────────
export const getAdminBookings = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const { status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user",     "name email avatar")
        .populate("provider", "name email")
        .populate({ path: "item", select: "name title type rate" })
        .lean(),
      Booking.countDocuments(filter),
    ]);

    const statusCounts = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

    const shaped = bookings.map((b) => ({
      _id:       b._id,
      user:      { _id: b.user?._id, name: b.user?.name || "—", email: b.user?.email || "—", avatar: b.user?.avatar?.url || null },
      provider:  { _id: b.provider?._id, name: b.provider?.name || "—", email: b.provider?.email || "—" },
      item:      { name: b.item?.name || b.item?.title || "—", type: b.itemModel },
      date:      b.date,
      timeSlot:  b.timeSlot,
      notes:     b.notes || "",
      status:    b.status,
      createdAt: b.createdAt,
    }));

    res.json({ bookings: shaped, total, page, summary: countMap });
  } catch (err) {
    console.error("getAdminBookings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── LISTINGS (admin view) ────────────────────────────────────────────────────
export const getAdminListings = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { type, q } = req.query;

    const filter = {};
    if (type === "apartment")  filter.type = "Apartment";
    if (type === "hostel")     filter.type = "Hostel";
    if (type === "unavailable") filter.available = false;
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name:     { $regex: safe, $options: "i" } },
        { location: { $regex: safe, $options: "i" } },
      ];
    }

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("owner", "name email")
        .lean(),
      Listing.countDocuments(filter),
    ]);

    const shaped = listings.map((l) => ({
      _id:         l._id,
      name:        l.name,
      type:        l.type,
      location:    l.location,
      price:       l.price,
      rate:        l.rate || "per Year",
      beds:        l.beds  ?? 1,
      baths:       l.baths ?? 1,
      available:   l.available !== false,
      furnished:   l.furnished || false,
      distance:    l.distance || "",
      amenities:   l.amenities || [],
      image:       l.images?.[0]?.url || null,
      description: l.description || "",
      ownerName:   l.owner?.name  || "—",
      ownerEmail:  l.owner?.email || "",
      reviewCount: l.reviews?.length || 0,
      createdAt:   l.createdAt,
    }));

    res.json({ listings: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("getAdminListings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CATEGORIES (admin view) ──────────────────────────────────────────────────
export const getAdminCategories = async (req, res) => {
  try {
    const [cats, productCounts] = await Promise.all([
      Category.find()
        .sort({ name: 1 })
        .populate("subcategories", "name slug")
        .lean(),
      Product.aggregate([
        { $match: { category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const prodMap = Object.fromEntries(productCounts.map((p) => [p._id?.toString(), p.count]));

    const shaped = cats.map((c) => {
      // filter out nulls from populate (dangling refs to deleted subcategories)
      const subs = (c.subcategories || []).filter(Boolean);
      return {
        _id:              c._id,
        name:             c.name,
        slug:             c.slug,
        description:      c.description || "",
        image:            c.images?.[0]?.url || null,
        subcategories:    subs.map((s) => ({ _id: s._id, name: s.name, slug: s.slug })),
        subcategoryCount: subs.length,
        productCount:     prodMap[c._id.toString()] || 0,
        createdAt:        c.createdAt,
      };
    });

    res.json({ categories: shaped, total: shaped.length });
  } catch (err) {
    console.error("getAdminCategories:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const cat  = await Category.create({ name, slug, description });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Category already exists" });
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

// ─── SUPPORT ROLE MANAGEMENT ──────────────────────────────────────────────────
export const getSupportAdmins = async (req, res) => {
  try {
    const admins = await User.find({ roles: "admin" })
      .select("name email avatar supportRole")
      .lean();
    res.json(admins.map((a) => ({
      _id:         a._id,
      name:        a.name,
      email:       a.email,
      avatar:      a.avatar?.url || null,
      supportRole: a.supportRole || null,
    })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const setSupportRole = async (req, res) => {
  try {
    const { supportRole } = req.body;
    const valid = ["technical", "administrative", null, ""];
    if (!valid.includes(supportRole)) return res.status(400).json({ message: "Invalid role" });
    const user = await User.findById(req.params.userId);
    if (!user || !user.roles.includes("admin")) return res.status(404).json({ message: "Admin user not found" });
    user.supportRole = supportRole || null;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Public — no auth required, used by the contact picker
export const getSupportTeam = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { roles: "admin", supportRole: { $ne: null } };
    if (role) filter.supportRole = role;
    const admins = await User.find(filter).select("name avatar supportRole").lean();
    res.json(admins.map((a) => ({
      _id:         a._id,
      name:        a.name,
      avatar:      a.avatar?.url || null,
      supportRole: a.supportRole,
    })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export const getAdminDisputes = async (req, res) => {
  try {
    const { status = "open" } = req.query;
    const statusFilter = status === "open" ? "disputed" : status;

    const orders = await Order.find({ status: statusFilter })
      .sort({ updatedAt: 1 })
      .populate("buyer",  "name email")
      .populate("seller", "name")
      .lean();

    const now = Date.now();
    const SLA_HOURS = 48;

    const disputes = orders.map((o) => {
      const ageHours = (now - new Date(o.updatedAt).getTime()) / 3_600_000;
      const slaHours = Math.max(0, SLA_HOURS - ageHours);
      const firstItem = o.items?.[0];
      return {
        _id:         o._id,
        caseRef:     `D-${o._id.toString().slice(-4).toUpperCase()}`,
        order:       { orderRef: o.orderRef || o._id.toString().slice(-6).toUpperCase() },
        reason:      o.disputeReason || "Buyer filed a dispute",
        filedBy:     o.buyer,
        productName: firstItem?.name || "Order item",
        amount:      o.totalAmount,
        slaHours:    Math.round(slaHours),
        slaLabel:    slaHours < 1 ? "Overdue" : `${Math.round(slaHours)}h left`,
        messages:    o.disputeMessages || [],
        createdAt:   o.updatedAt,
      };
    });

    res.json({ disputes });
  } catch (err) {
    console.error("getAdminDisputes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { outcome, note } = req.body;
    const order = await Order.findById(req.params.disputeId);
    if (!order) return res.status(404).json({ message: "Dispute not found" });
    if (order.status !== "disputed") return res.status(400).json({ message: "Order is not disputed" });

    // Map human-readable outcome labels to valid Order status enum values
    const outcomeStatusMap = {
      "Refund buyer in full": "cancelled",
      "Refund 50%":           "cancelled",
      "Seller credit":        "completed",
      "Reject claim":         "completed",
    };
    order.status            = outcomeStatusMap[outcome] || "completed";
    order.disputeOutcome    = outcome;
    order.disputeNote       = note;
    order.disputeResolvedAt = new Date();
    order.disputeResolvedBy = req.user._id;
    await order.save({ validateModifiedOnly: true });

    res.json({ success: true });
  } catch (err) {
    console.error("resolveDispute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── REVIEWS (admin view) ─────────────────────────────────────────────────────
export const getAdminReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { type, rating, q } = req.query;

    const filter = {};
    if (type)                    filter.refModel = type;
    if (rating && !isNaN(rating)) filter.rating  = parseInt(rating);
    if (q)                       filter.text     = { $regex: q, $options: "i" };

    const [reviews, total, starAgg] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "name email avatar")
        .populate({ path: "refId", select: "name title" })
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([{ $group: { _id: "$rating", count: { $sum: 1 } } }]),
    ]);

    const starMap = Object.fromEntries(starAgg.map((s) => [s._id, s.count]));
    const avgRating = starAgg.length
      ? starAgg.reduce((a, s) => a + s._id * s.count, 0) / starAgg.reduce((a, s) => a + s.count, 0)
      : 0;

    const shaped = reviews.map((r) => ({
      _id:       r._id,
      author:    { _id: r.author?._id, name: r.author?.name || "—", email: r.author?.email || "—", avatar: r.author?.avatar?.url || null },
      subject:   r.refId?.name || r.refId?.title || "—",
      type:      r.refModel,
      rating:    r.rating,
      text:      r.text,
      createdAt: r.createdAt,
    }));

    res.json({ reviews: shaped, total, page, starMap, avgRating: Math.round(avgRating * 10) / 10 });
  } catch (err) {
    console.error("getAdminReviews:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── REPORTED CONTENT ─────────────────────────────────────────────────────────
export const getAdminReports = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status, type } = req.query;

    const filter = {};
    if (status) filter.status   = status;
    if (type)   filter.refModel = type;

    const [reports, total, statusAgg] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporter", "name email avatar")
        .populate({ path: "refId", select: "name title storeName" })
        .lean(),
      Report.countDocuments(filter),
      Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const counts = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));

    const shaped = reports.map((r) => ({
      _id:        r._id,
      refModel:   r.refModel,
      refName:    r.refId?.name || r.refId?.title || r.refId?.storeName || "—",
      reporter:   { _id: r.reporter?._id, name: r.reporter?.name || "—", email: r.reporter?.email || "—" },
      reason:     r.reason,
      description: r.description || "",
      status:     r.status,
      resolution: r.resolution || "",
      createdAt:  r.createdAt,
    }));

    res.json({ reports: shaped, total, page, counts });
  } catch (err) {
    console.error("getAdminReports:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { action, resolution } = req.body;
    const VALID_ACTIONS = ["dismiss", "remove", "review"];
    if (!VALID_ACTIONS.includes(action))
      return res.status(400).json({ message: "Invalid action" });

    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    report.status     = action === "remove" ? "removed" : action === "review" ? "reviewed" : "dismissed";
    report.resolution = resolution || "";
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    res.json({ success: true });
  } catch (err) {
    console.error("resolveReport:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── BROADCASTS ───────────────────────────────────────────────────────────────
export const deleteBroadcast = async (req, res) => {
  try {
    await Broadcast.findByIdAndDelete(req.params.broadcastId);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteBroadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBroadcasts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const broadcasts = await Broadcast.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ broadcasts });
  } catch (err) {
    console.error("getBroadcasts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createBroadcast = async (req, res) => {
  try {
    const { title, body, audience, channels, ctaLabel, ctaLink, sendAt, expires } = req.body;
    if (!title?.trim() || !body?.trim())
      return res.status(400).json({ message: "Title and body are required" });

    const ch = channels || { inapp: true, push: true, email: false };
    const isScheduled = sendAt && new Date(sendAt) > new Date();

    const broadcast = await Broadcast.create({
      title:    title.trim(),
      body:     body.trim(),
      audience: audience || "all",
      channels: ch,
      ctaLabel, ctaLink,
      sendAt:   sendAt || null,
      expires:  expires || null,
      status:   isScheduled ? "scheduled" : "sent",
      sentAt:   isScheduled ? null : new Date(),
      sentBy:   req.user._id,
    });

    // Scheduled broadcasts: just save, a cron job would fire them later
    if (isScheduled) return res.status(201).json({ success: true, broadcast });

    // ── Build audience user filter ───────────────────────────────────────────
    const roleFilter =
      audience === "sellers"   ? { roles: "seller" }           :
      audience === "buyers"    ? { roles: "user" }             :
      audience === "providers" ? { roles: "service_provider" } :
      {};                        // "all" — no filter

    let reach = 0;

    // ── In-app: create Notification + real-time socket emit ─────────────────
    if (ch.inapp) {
      const users = await User.find(roleFilter).select("_id").lean();
      const notifDocs = users.map((u) => ({
        user:    u._id,
        type:    "system",
        title:   title.trim(),
        message: body.trim(),
        link:    ctaLink || "",
      }));

      if (notifDocs.length) {
        await Notification.insertMany(notifDocs, { ordered: false });
        reach = Math.max(reach, users.length);

        // Push to all connected sockets
        const io = (await import("../utils/socket.js")).getIO();
        if (io) {
          const payload = { type: "system", title: title.trim(), message: body.trim(), link: ctaLink || "", read: false, createdAt: new Date() };
          users.forEach((u) => io.to(u._id.toString()).emit("new_notification", payload));
        }
      }
    }

    // ── Web push: send to all subscribed browsers ────────────────────────────
    if (ch.push) {
      const subFilter = audience === "all" ? {} : roleFilter;
      // PushSub.roles mirrors User.roles — query directly without joining
      const audienceRole =
        audience === "sellers"   ? "seller"           :
        audience === "buyers"    ? "user"             :
        audience === "providers" ? "service_provider" :
        null;
      const pushFilter = audienceRole ? { roles: audienceRole } : {};

      const subs = await PushSub.find(pushFilter).lean();
      const pushPayload = {
        title: title.trim(),
        body:  body.trim(),
        icon:  "/icon-192.png",
        badge: "/badge-72.png",
        url:   ctaLink || "/",
        tag:   broadcast._id.toString(),   // collapses duplicate notifications
      };
      const pushed = await sendPushToSubs(subs, pushPayload);
      reach = Math.max(reach, pushed);
    }

    // Update reach count
    await Broadcast.findByIdAndUpdate(broadcast._id, { reach });

    res.status(201).json({ success: true, broadcast: { ...broadcast.toObject(), reach } });
  } catch (err) {
    console.error("createBroadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── SITE CONFIG ──────────────────────────────────────────────────────────────
export const getConfig = async (req, res) => {
  try {
    const config = await Config.findOne().lean();
    if (!config) return res.json({ fees: {}, flags: {}, slides: [], logo: {} });
    const { fees, flags, slides, logo } = config;
    res.json({ fees, flags, slides, logo });
  } catch (err) {
    console.error("getConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveConfig = async (req, res) => {
  try {
    const { fees, flags, slides, logo } = req.body;
    const update = { fees, flags, slides, updatedBy: req.user._id };
    if (logo !== undefined) update.logo = logo;
    await Config.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("saveConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── INVITE / CREATE ADMIN ACCOUNT ───────────────────────────────────────────
// Creates a regular user account (no admin role). Admin must grant admin role
// manually via database to preserve the "no API can elevate to admin" constraint.
export const inviteAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      isVerified: true,
      roles: ["user"],
    });
    await user.save();

    res.status(201).json({
      message: "Account created. Grant admin role manually via database.",
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    console.error("inviteAdmin:", err);
    res.status(500).json({ message: "Server error" });
  }
};
