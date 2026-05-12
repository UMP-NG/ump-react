// controllers/serviceAnalytics.js
import ServiceSession from "../models/ServiceSession.js";
import Service from "../models/Service.js";

export const getKpiData = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalRevenue = await ServiceSession.aggregate([
      {
        $match: {
          provider: userId,
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const sessionsCompleted = await ServiceSession.countDocuments({
      provider: userId,
    });
    const ratings = await ServiceSession.aggregate([
      { $match: { provider: userId, rating: { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      sessionsCompleted,
      avgRating: ratings[0]?.avgRating?.toFixed(1) || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getRecentSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessions = await ServiceSession.find({ provider: userId })
      .sort({ date: -1 })
      .limit(5)
      .populate("client", "name");

    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDailyRevenue = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = Array.from(
      { length: 30 },
      (_, i) => new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    );

    const revenue = await Promise.all(
      days.map(async (day) => {
        const start = new Date(day.setHours(0, 0, 0, 0));
        const end = new Date(day.setHours(23, 59, 59, 999));
        const sum = await ServiceSession.aggregate([
          { $match: { provider: userId, date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$price" } } },
        ]);
        return sum[0]?.total || 0;
      })
    );

    res.json({ labels: days.map((d) => d.toDateString()), revenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
