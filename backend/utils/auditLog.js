import AuditLog from "../models/AuditLog.js";

/**
 * Record a security / financial audit event.
 * Never throws — a logging failure must never break a transaction.
 */
export const audit = async (action, { actor, entity, entityId, amount, meta, req, status = "ok" } = {}) => {
  try {
    await AuditLog.create({
      actor,
      action,
      entity,
      entityId,
      amount,
      meta,
      status,
      ip: req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
  } catch (err) {
    console.error("⚠️  Audit log write failed:", err.message);
  }
};
