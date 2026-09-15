import Feedback from "../models/Feedback.js";
import logger from "../utils/logger.js";

export const getAdminFeedback = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [feedback, total, statusAgg] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "name email").lean(),
      Feedback.countDocuments(filter),
      Feedback.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));

    res.json({ feedback, total, page, counts });
  } catch (err) {
    logger.error("getAdminFeedback:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const markFeedbackReviewed = async (req, res) => {
  try {
    const updated = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      { status: "reviewed" },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Feedback not found" });
    res.json({ success: true });
  } catch (err) {
    logger.error("markFeedbackReviewed:", err);
    res.status(500).json({ message: "Server error" });
  }
};
