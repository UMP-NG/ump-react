import mongoose from "mongoose";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Order from "../models/Order.js";
import Payout from "../models/Payout.js";
import Product from "../models/Product.js";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n || isNaN(n)) return "₦0";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${Math.round(n).toLocaleString()}`;
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
  try {
    const now        = new Date();
    const today      = startOf(0);
    const thirty     = startOf(30);
    const ninety     = startOf(90);

    const [
      totalUsers,
      newUsersToday,
      totalSellers,
      newSellersToday,
      pendingSellers,
      orderAgg,
      payoutAgg,
      disputes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Seller.countDocuments(),
      Seller.countDocuments({ createdAt: { $gte: today } }),
      Seller.countDocuments({ isVerified: false, verificationRequested: true }),

      // Active orders value + platform revenue (3.2% fee)
      Order.aggregate([
        {
          $facet: {
            active: [
              { $match: { status: { $in: ["pending", "confirmed", "shipped"] } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
            revenue30d: [
              { $match: { status: "completed", createdAt: { $gte: thirty } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
          },
        },
      ]),

      // Pending payouts
      Payout.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),

      // Disputes = orders with status disputed
      Order.countDocuments({ status: "disputed" }),
    ]);

    const activeVal   = orderAgg[0]?.active[0]?.total   || 0;
    const revenue30d  = orderAgg[0]?.revenue30d[0]?.total || 0;
    const payoutVal   = payoutAgg[0]?.total  || 0;
    const payoutCount = payoutAgg[0]?.count  || 0;

    res.json({
      totalUsers,
      newUsersToday,
      totalSellers,
      newSellersToday,
      pendingSellers,
      activeOrdersValue:   fmt(activeVal),
      platformRevenue30d:  fmt(revenue30d * 0.032),
      pendingPayoutsValue: fmt(payoutVal),
      pendingPayoutsCount: payoutCount,
      flaggedCount:        disputes,
      disputes,
      reports: 0,
    });
  } catch (err) {
    console.error("getAdminStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── ACTIVITY CHART (30-day daily orders / revenue / new users) ──────────────
export const getActivityChart = async (req, res) => {
  try {
    const days   = 30;
    const since  = startOf(days);

    const [orderDays, userDays] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders:  { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            users: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build a full 30-day array (fill missing days with 0)
    const orderMap  = Object.fromEntries(orderDays.map((d) => [d._id, d]));
    const userMap   = Object.fromEntries(userDays.map((d)  => [d._id, d.users]));
    const orders    = [];
    const revenue   = [];
    const users     = [];

    for (let i = days - 1; i >= 0; i--) {
      const key = startOf(i).toISOString().slice(0, 10);
      orders.push(orderMap[key]?.orders  || 0);
      revenue.push(orderMap[key]?.revenue || 0);
      users.push(userMap[key]            || 0);
    }

    res.json({ orders, revenue, users });
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

    res.json(orders);
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
    if (q)    filter.$or = [
      { name:  { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];

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
    if (status === "pending")   { filter.isVerified = false; filter.verificationRequested = true; filter.isSuspended = { $ne: true }; }
    if (status === "suspended") { filter.isSuspended = true; }
    if (q) filter.$text = { $search: q };

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
      Product.aggregate([
        { $match: { seller: { $in: sellerIds } } },
        { $group: { _id: "$seller", count: { $sum: 1 } } },
      ]),
    ]);

    const revMap  = Object.fromEntries(rev30.map((r)    => [r._id.toString(), r.total]));
    const prodMap = Object.fromEntries(prodCounts.map((p) => [p._id.toString(), p.count]));

    const shaped = sellers.map((s) => ({
      _id:                s._id,
      storeName:          s.storeName || s.name,
      ownerName:          s.user?.name  || s.name,
      email:              s.user?.email || "",
      phone:              s.user?.phone || s.phone || "",
      category:           Array.isArray(s.category) ? s.category[0] : s.category || "",
      description:        s.description || s.bio || "",
      productCount:       prodMap[s._id.toString()] ?? s.totalProducts ?? 0,
      revenue30d:         revMap[s.user?._id?.toString()] ?? 0,
      averageRating:      s.rating || 0,
      verificationStatus: sellerStatus(s),
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
        .populate("buyer",  "name email")
        .populate("seller", "name")
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
    const payout = await Payout.findById(req.params.payoutId);
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    if (payout.status !== "pending") return res.status(400).json({ message: "Payout is not pending" });

    payout.status = "processing";
    await payout.save();

    // Deduct from seller's pendingPayout balance
    if (payout.seller) {
      await Seller.findOneAndUpdate(
        { user: payout.seller },
        { $inc: { pendingPayout: -payout.amount } }
      );
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
        { $unwind: { path: "$prod", preserveNullAndEmpty: true } },
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
        { $unwind: { path: "$sellerDoc", preserveNullAndEmpty: true } },
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
