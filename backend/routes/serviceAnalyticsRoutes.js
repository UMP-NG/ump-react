// routes/serviceAnalytics.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getKpiData,
  getRecentSessions,
  getDailyRevenue,
} from "../controllers/serviceAnalyticsController.js";

const router = express.Router();

// Only service providers can access
router.use(protect, (req, res, next) => {
  if (!req.user.roles.includes("service_provider"))
    return res.status(403).json({ message: "Access denied" });
  next();
});

router.get("/kpi", getKpiData);
router.get("/sessions/recent", getRecentSessions);
router.get("/revenue/daily", getDailyRevenue);

export default router;
