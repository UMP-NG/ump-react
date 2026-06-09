import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Order from "../models/Order.js";
import Payout from "../models/Payout.js";
import logger from "../utils/logger.js";
import { scGet, scSet, fmt, startOf } from "./adminHelpers.js";

export const getAdminStats = async (req, res) => {
  const VALID_DAYS = [1, 7, 30, 365, 1825];
  const days = VALID_DAYS.includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 30;
  const cached = scGet(`stats:${days}`, 60_000);
  if (cached) return res.json(cached);
  try {
    const since = startOf(days);
    const [newUsers, totalUsers, newSellers, totalSellers, orderAgg, payoutAgg, disputes] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: since } }),
      User.countDocuments(),
      Seller.countDocuments({ createdAt: { $gte: since } }),
      Seller.countDocuments(),
      Order.aggregate([{ $facet: {
        active:  [{ $match: { status: { $in: ["pending","confirmed","shipped"] } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }],
        period:  [{ $match: { createdAt: { $gte: since } } }, { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }],
        revenue: [{ $match: { status: "completed", createdAt: { $gte: since } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }],
      }}]),
      Payout.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Order.countDocuments({ status: "disputed" }),
    ]);
    const activeVal   = orderAgg[0]?.active[0]?.total  || 0;
    const periodGMV   = orderAgg[0]?.period[0]?.total  || 0;
    const periodCount = orderAgg[0]?.period[0]?.count  || 0;
    const periodRev   = orderAgg[0]?.revenue[0]?.total || 0;
    const payoutVal   = payoutAgg[0]?.total  || 0;
    const payoutCount = payoutAgg[0]?.count  || 0;
    const result = {
      days, newUsers, newSellers,
      periodOrdersValue: fmt(periodGMV), periodOrderCount: periodCount,
      platformRevenue: fmt(periodRev * 0.032),
      totalUsers, totalSellers,
      activeOrdersValue: fmt(activeVal),
      pendingPayoutsValue: fmt(payoutVal), pendingPayoutsCount: payoutCount,
      flaggedCount: disputes, disputes, reports: 0,
    };
    scSet(`stats:${days}`, result);
    res.json(result);
  } catch (err) {
    logger.error("getAdminStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getActivityChart = async (req, res) => {
  const VALID_DAYS = [1, 7, 30, 365, 1825];
  const days = VALID_DAYS.includes(parseInt(req.query.days)) ? parseInt(req.query.days) : 30;
  const chartCached = scGet(`chart:${days}`, 120_000);
  if (chartCached) return res.json(chartCached);
  try {
    const since   = startOf(days);
    const monthly = days > 30;
    const fmtStr  = monthly ? "%Y-%m" : "%Y-%m-%d";
    const [orderBuckets, userBuckets] = await Promise.all([
      Order.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: fmtStr, date: "$createdAt" } }, orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } }, { $sort: { _id: 1 } }]),
      User.aggregate([ { $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: fmtStr, date: "$createdAt" } }, users: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    const orderMap = Object.fromEntries(orderBuckets.map((d) => [d._id, d]));
    const userMap  = Object.fromEntries(userBuckets.map((d)  => [d._id, d.users]));
    const orders = [], revenue = [], users = [], labels = [];
    if (monthly) {
      const months = days === 365 ? 12 : 60;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
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
    logger.error("getActivityChart:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRecentOrders = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);
    const orders = await Order.find()
      .sort({ createdAt: -1 }).limit(limit)
      .populate("buyer", "name email").populate("seller", "storeName").lean();
    const shaped = orders.map((o) => ({
      ...o,
      orderRef: o.paymentInfo?.reference || `UMP-${o._id.toString().slice(-6).toUpperCase()}`,
    }));
    res.json(shaped);
  } catch (err) {
    logger.error("getRecentOrders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const ninety = startOf(90);
    const thirty = startOf(30);
    const [gmvAgg, categoryAgg, topSellerAgg, repeatBuyers, totalBuyers] = await Promise.all([
      Order.aggregate([{ $match: { status: "completed", createdAt: { $gte: thirty } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, gmv: { $sum: "$totalAmount" } } }, { $sort: { _id: 1 } }]),
      Order.aggregate([{ $match: { status: "completed", createdAt: { $gte: ninety } } }, { $unwind: "$items" }, { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "prod" } }, { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } }, { $group: { _id: { $ifNull: ["$prod.category","Other"] }, total: { $sum: { $multiply: ["$items.price","$items.quantity"] } } } }, { $sort: { total: -1 } }, { $limit: 6 }]),
      Order.aggregate([{ $match: { status: "completed", createdAt: { $gte: ninety } } }, { $group: { _id: "$seller", orders: { $sum: 1 }, gmv: { $sum: "$totalAmount" } } }, { $sort: { gmv: -1 } }, { $limit: 5 }, { $lookup: { from: "sellers", localField: "_id", foreignField: "user", as: "sellerDoc" } }, { $unwind: { path: "$sellerDoc", preserveNullAndEmptyArrays: true } }]),
      Order.aggregate([{ $match: { status: "completed", createdAt: { $gte: ninety } } }, { $group: { _id: "$buyer", count: { $sum: 1 } } }, { $group: { _id: null, repeat: { $sum: { $cond: [{ $gt: ["$count", 1] }, 1, 0] } }, total: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { status: "completed", createdAt: { $gte: ninety } } }, { $group: { _id: null, gmv: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
    ]);
    const gmvMap   = Object.fromEntries(gmvAgg.map((d) => [d._id, d.gmv]));
    const gmvDaily = [];
    for (let i = 29; i >= 0; i--) gmvDaily.push(gmvMap[startOf(i).toISOString().slice(0, 10)] || 0);
    const catTotal   = categoryAgg.reduce((s, c) => s + c.total, 0) || 1;
    const categoryMix = categoryAgg.map((c) => ({ label: c._id || "Other", pct: Math.round((c.total / catTotal) * 100), value: fmt(c.total).replace("₦",""), v: Math.round((c.total / catTotal) * 100) }));
    const topSellers  = topSellerAgg.map((s) => [s.sellerDoc?.storeName || s.sellerDoc?.name || "Unknown", s.orders, fmt(s.gmv).replace("₦","")]);
    const gmv90    = totalBuyers[0]?.gmv   || 0;
    const count90  = totalBuyers[0]?.count || 0;
    const repeatPct = repeatBuyers[0] ? ((repeatBuyers[0].repeat / (repeatBuyers[0].total || 1)) * 100).toFixed(1) : "0.0";
    res.json({ gmvDaily, categoryMix, topSellers, gmv90d: fmt(gmv90), fees90d: fmt(gmv90 * 0.032), avgOrder: fmt(count90 ? gmv90 / count90 : 0), repeatRate: `${repeatPct}%` });
  } catch (err) {
    logger.error("getAnalytics:", err);
    res.status(500).json({ message: "Server error" });
  }
};
