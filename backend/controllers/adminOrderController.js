import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import logger from "../utils/logger.js";

export const getAdminOrders = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("buyer",  "name email avatar")
        .populate("seller", "name email")
        .populate({ path: "items.product", select: "name images price" })
        .lean(),
      Order.countDocuments(filter),
    ]);
    const sellerUserIds = [...new Set(orders.map((o) => o.seller?._id).filter(Boolean))];
    const sellerDocs    = sellerUserIds.length ? await Seller.find({ user: { $in: sellerUserIds } }).select("user storeName").lean() : [];
    const storeMap      = Object.fromEntries(sellerDocs.map((s) => [s.user.toString(), s.storeName]));
    const shaped = orders.map((o) => ({ ...o, seller: o.seller ? { ...o.seller, storeName: storeMap[o.seller._id?.toString()] || o.seller.name || "—" } : null }));
    res.json({ orders: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminOrders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrdersSummary = async (req, res) => {
  try {
    const counts = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const map    = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json({
      pending:   (map.pending || 0) + (map["pending-verification"] || 0),
      shipped:   map.shipped   || 0,
      completed: map.completed || 0,
      cancelled: map.cancelled || 0,
      disputed:  map.disputed  || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
