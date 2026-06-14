import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Report from "../models/Report.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

export const getAdminDisputes = async (req, res) => {
  try {
    const { status = "open" } = req.query;
    const statusFilter = status === "open" ? "disputed" : status;
    const orders = await Order.find({ status: statusFilter }).sort({ updatedAt: 1 })
      .populate("buyer", "name email").populate("seller", "name").lean();
    const now = Date.now(), SLA_HOURS = 48;
    const disputes = orders.map((o) => {
      const ageHours = (now - new Date(o.updatedAt).getTime()) / 3_600_000;
      const slaHours = Math.max(0, SLA_HOURS - ageHours);
      return {
        _id: o._id, caseRef: `D-${o._id.toString().slice(-4).toUpperCase()}`,
        order: { orderRef: o.orderRef || o._id.toString().slice(-6).toUpperCase() },
        reason: o.disputeReason || "Buyer filed a dispute", filedBy: o.buyer,
        productName: o.items?.[0]?.name || "Order item", amount: o.totalAmount,
        slaHours: Math.round(slaHours), slaLabel: slaHours < 1 ? "Overdue" : `${Math.round(slaHours)}h left`,
        messages: o.disputeMessages || [], createdAt: o.updatedAt,
      };
    });
    res.json({ disputes });
  } catch (err) {
    logger.error("getAdminDisputes:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { outcome, note } = req.body;
    const order = await Order.findById(req.params.disputeId);
    if (!order) return res.status(404).json({ message: "Dispute not found" });
    if (order.status !== "disputed") return res.status(400).json({ message: "Order is not disputed" });
    const outcomeStatusMap = { "Refund buyer in full": "cancelled", "Refund 50%": "cancelled", "Seller credit": "completed", "Reject claim": "completed" };
    order.status = outcomeStatusMap[outcome] || "completed";
    order.disputeOutcome = outcome; order.disputeNote = note; order.disputeResolvedAt = new Date(); order.disputeResolvedBy = req.user._id;
    await order.save({ validateModifiedOnly: true });

    const resolvedMsg = `Dispute resolved: ${outcome}. ${note || ""}`.trim();
    if (order.buyer) notify(order.buyer, { type: "order", title: "Dispute resolved", message: resolvedMsg, link: `/orders/${order._id}` }).catch(() => {});
    if (order.seller) notify(order.seller, { type: "order", title: "Dispute resolved", message: resolvedMsg, link: `/orders/${order._id}` }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    logger.error("resolveDispute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { type, rating, q } = req.query;
    const filter = {};
    if (type)                     filter.refModel = type;
    if (rating && !isNaN(rating)) filter.rating   = parseInt(rating);
    if (q)                        filter.text      = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const [reviews, total, starAgg] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author","name email avatar").populate({ path: "refId", select: "name title" }).lean(),
      Review.countDocuments(filter),
      Review.aggregate([{ $match: filter }, { $group: { _id: "$rating", count: { $sum: 1 } } }]),
    ]);
    const starMap   = Object.fromEntries(starAgg.map((s) => [s._id, s.count]));
    const avgRating = starAgg.length ? starAgg.reduce((a, s) => a + s._id * s.count, 0) / starAgg.reduce((a, s) => a + s.count, 0) : 0;
    const shaped = reviews.map((r) => ({
      _id: r._id, author: { _id: r.author?._id, name: r.author?.name || "—", email: r.author?.email || "—", avatar: r.author?.avatar?.url || null },
      subject: r.refId?.name || r.refId?.title || "—", type: r.refModel, rating: r.rating, text: r.text, createdAt: r.createdAt,
    }));
    res.json({ reviews: shaped, total, page, starMap, avgRating: Math.round(avgRating * 10) / 10 });
  } catch (err) {
    logger.error("getAdminReviews:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.reviewId);
    if (!deleted) return res.status(404).json({ message: "Review not found" });

    if (deleted.author) {
      notify(deleted.author, {
        type:    "account",
        title:   "Review removed",
        message: "One of your reviews has been removed by an admin for violating our community guidelines.",
        link:    "/orders",
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("deleteReview:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("reporter","name email avatar").populate({ path: "refId", select: "name title storeName" }).lean(),
      Report.countDocuments(filter),
      Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
    const shaped = reports.map((r) => ({
      _id: r._id, refModel: r.refModel, refName: r.refId?.name || r.refId?.title || r.refId?.storeName || "—",
      reporter: { _id: r.reporter?._id, name: r.reporter?.name || "—", email: r.reporter?.email || "—" },
      reason: r.reason, description: r.description || "", status: r.status, resolution: r.resolution || "", createdAt: r.createdAt,
    }));
    res.json({ reports: shaped, total, page, counts });
  } catch (err) {
    logger.error("getAdminReports:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveReport = async (req, res) => {
  try {
    const { action, resolution } = req.body;
    if (!["dismiss","remove","review"].includes(action)) return res.status(400).json({ message: "Invalid action" });
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });
    report.status     = action === "remove" ? "removed" : action === "review" ? "reviewed" : "dismissed";
    report.resolution = resolution || ""; report.resolvedBy = req.user._id; report.resolvedAt = new Date();
    await report.save();

    if (report.reporter) {
      notify(report.reporter, {
        type: "account",
        title: "Your report was reviewed",
        message: `Your report has been ${report.status}.${resolution ? " " + resolution : ""}`,
        link: "/",
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("resolveReport:", err);
    res.status(500).json({ message: "Server error" });
  }
};
