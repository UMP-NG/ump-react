import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

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
      filter.$or = [{ name: { $regex: safeQ, $options: "i" } }, { email: { $regex: safeQ, $options: "i" } }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select("-password -otp -otpExpire -resetPasswordToken -resetPasswordExpire -schoolEmailOtp -schoolEmailOtpExpire -fcmToken").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    const shaped = users.map((u) => ({ ...u, isBlocked: u.status === "banned", isSuspended: u.status === "inactive", emailVerified: u.isVerified, orderCount: u.orders?.length || 0 }));
    res.json({ users: shaped, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("getAdminUsers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.roles.includes("admin")) return res.status(403).json({ message: "Cannot ban an admin" });
    user.status = "banned";
    await user.save({ validateModifiedOnly: true });
    notify(user._id, { type: "account", title: "Account suspended", message: "Your account has been suspended by an admin.", link: "/settings" }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    logger.error("banUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.status = "active";
    await user.save({ validateModifiedOnly: true });
    notify(user._id, { type: "account", title: "Account restored", message: "Your account has been restored. Welcome back!", link: "/" }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    logger.error("unbanUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminTeam = async (req, res) => {
  try {
    const admins = await User.find({ roles: "admin" }).select("name email avatar roles createdAt status").sort({ createdAt: -1 }).lean();
    res.json({ admins: admins.map((a) => ({ _id: a._id, name: a.name, email: a.email, avatar: a.avatar?.url || null, adminRole: "admin", lastActiveLabel: "—" })) });
  } catch (err) {
    logger.error("getAdminTeam:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const logs  = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).populate("actor", "name").lean();
    const activity = logs.map((l) => ({
      _id: l._id, adminName: l.actor?.name || "System", action: l.action,
      target: l.entity ? `${l.entity}${l.entityId ? ` #${l.entityId.toString().slice(-4)}` : ""}`.trim() : "",
      createdAt: l.createdAt,
      timeLabel: new Date(l.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    }));
    res.json({ activity });
  } catch (err) {
    logger.error("getAdminActivity:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdminProviders = async (req, res) => {
  try {
    const { status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50,  parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const baseQuery = { roles: "service_provider" };
    if (status === "suspended") baseQuery.status = "banned";
    const [users, total] = await Promise.all([
      User.find(baseQuery).select("name email phone createdAt status serviceProviderInfo").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(baseQuery),
    ]);
    const userIds = users.map((u) => u._id);
    const [services, bookingCounts] = await Promise.all([
      userIds.length ? Service.find({ provider: { $in: userIds } }).select("provider name major rating rate desc about certifications verified verificationRequested").lean() : [],
      userIds.length ? Booking.aggregate([{ $match: { provider: { $in: userIds } } }, { $group: { _id: "$provider", count: { $sum: 1 } } }]) : [],
    ]);
    const svcMap = {};
    for (const s of services) { const k = s.provider.toString(); if (!svcMap[k]) svcMap[k] = s; }
    const bookingMap = Object.fromEntries(bookingCounts.map((b) => [b._id.toString(), b.count]));
    const shaped = users.map((u) => {
      const svc = svcMap[u._id.toString()];
      const spInfo = u.serviceProviderInfo || {};
      const isSuspended = u.status === "banned";
      const verSt = isSuspended ? "suspended" : (svc?.verified || spInfo.verified) ? "verified" : "pending";
      return { _id: u._id, businessName: svc?.name || spInfo.businessName || u.name, email: u.email, phone: u.phone || "", category: svc?.major || spInfo.skills?.[0] || "", rate: svc?.rate || spInfo.rate || 0, description: svc?.about || svc?.desc || spInfo.bio || "", certifications: svc?.certifications || [], bookingCount: bookingMap[u._id.toString()] ?? 0, averageRating: svc?.rating || 0, verificationStatus: verSt, createdAt: u.createdAt, _status: verSt };
    }).filter((p) => !status || p._status === status);
    res.json({ providers: shaped, total });
  } catch (err) {
    logger.error("getAdminProviders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "Provider not found" });
    const service = await Service.findOne({ provider: user._id });
    if (service) { service.verified = true; service.verificationRequested = false; await service.save(); }
    if (!user.roles.includes("service_provider")) { user.roles.push("service_provider"); await user.save(); }

    notify(user._id, {
      type:    "account",
      title:   "Service provider approved!",
      message: "Your service provider application has been approved. You can now offer services on UMP.",
      link:    "/provider-analytics",
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    logger.error("approveProvider:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSupportAdmins = async (req, res) => {
  try {
    const admins = await User.find({ roles: "admin" }).select("name email avatar supportRole").lean();
    res.json(admins.map((a) => ({ _id: a._id, name: a.name, email: a.email, avatar: a.avatar?.url || null, supportRole: a.supportRole || null })));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const setSupportRole = async (req, res) => {
  try {
    const { supportRole } = req.body;
    if (!["technical","administrative",null,""].includes(supportRole)) return res.status(400).json({ message: "Invalid role" });
    const user = await User.findById(req.params.userId);
    if (!user || !user.roles.includes("admin")) return res.status(404).json({ message: "Admin user not found" });
    user.supportRole = supportRole || null;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    logger.error("setSupportRole:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSupportTeam = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { roles: "admin", supportRole: { $ne: null } };
    if (role) filter.supportRole = role;
    const admins = await User.find(filter).select("name avatar supportRole").lean();
    res.json(admins.map((a) => ({ _id: a._id, name: a.name, avatar: a.avatar?.url || null, supportRole: a.supportRole })));
  } catch (err) {
    logger.error("getSupportTeam:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const inviteAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });
    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), password, isVerified: true, roles: ["user"] });
    await user.save();
    res.status(201).json({ message: "Account created. Grant admin role manually via database.", userId: user._id, email: user.email });
  } catch (err) {
    logger.error("inviteAdmin:", err);
    res.status(500).json({ message: "Server error" });
  }
};
