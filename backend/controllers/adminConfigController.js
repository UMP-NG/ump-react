import Config from "../models/Config.js";
import Product from "../models/Product.js";
import logger from "../utils/logger.js";

// Public — returns logo, slides, flags, buyer-facing fee settings, and active events
export const publicConfig = async (req, res) => {
  try {
    const config = await Config.findOne().select("logo slides flags fees events").lean();
    if (!config) return res.json({ logo: {}, slides: [], flags: {}, fees: {}, events: [] });
    const { fees } = config;
    // Only expose buyer-facing fields — never expose platformFee/platformFeeEnabled
    const publicFees = fees ? {
      serviceChargeEnabled: fees.serviceChargeEnabled ?? true,
      serviceFee:           fees.serviceFee           ?? 5.0,
      serviceChargeMin:     fees.serviceChargeMin      ?? 100,
      serviceChargeMax:     fees.serviceChargeMax      ?? 2000,
    } : {};
    // Populate products for active events
    const activeEvents = (config.events || []).filter((e) => e.active && e.productIds?.length);
    let eventsWithProducts = [];
    if (activeEvents.length) {
      const allIds = activeEvents.flatMap((e) => e.productIds);
      const prods = await Product.find({ _id: { $in: allIds } }).select("_id name price images slug").lean();
      const prodMap = Object.fromEntries(prods.map((p) => [p._id.toString(), p]));
      eventsWithProducts = activeEvents.map((e) => ({
        ...e,
        products: (e.productIds || []).map((id) => prodMap[id.toString()]).filter(Boolean),
      }));
    }
    res.json({ logo: config.logo || {}, slides: config.slides || [], flags: config.flags || {}, fees: publicFees, events: eventsWithProducts });
  } catch (err) {
    logger.error("publicConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConfig = async (req, res) => {
  try {
    const config = await Config.findOne().lean();
    if (!config) return res.json({ fees: {}, flags: {}, slides: [], logo: {}, subscriptions: {} });
    const { fees, flags, slides, logo, subscriptions } = config;
    res.json({ fees, flags, slides, logo, subscriptions: subscriptions || {} });
  } catch (err) {
    logger.error("getConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: get all events ──────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const config = await Config.findOne().select("events").lean();
    res.json({ events: config?.events || [] });
  } catch (err) {
    logger.error("getEvents:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: create or update an event ─────────────────────────────────────
export const saveEvent = async (req, res) => {
  try {
    const { eventId, title, emoji, productIds, active } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Event title is required" });

    if (eventId) {
      // Update existing
      await Config.findOneAndUpdate(
        { "events._id": eventId },
        { $set: { "events.$.title": title.trim(), "events.$.emoji": emoji || "🎉", "events.$.productIds": productIds || [], "events.$.active": active !== false } },
        { upsert: false }
      );
    } else {
      // Add new
      await Config.findOneAndUpdate(
        {},
        { $push: { events: { title: title.trim(), emoji: emoji || "🎉", productIds: productIds || [], active: active !== false } } },
        { upsert: true }
      );
    }
    res.json({ success: true });
  } catch (err) {
    logger.error("saveEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Admin: delete an event ────────────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  try {
    await Config.findOneAndUpdate({}, { $pull: { events: { _id: req.params.eventId } } });
    res.json({ success: true });
  } catch (err) {
    logger.error("deleteEvent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveConfig = async (req, res) => {
  try {
    const { fees, flags, slides, logo, subscriptions } = req.body;

    if (fees?.serviceChargeMin != null && fees?.serviceChargeMax != null &&
        Number(fees.serviceChargeMin) > Number(fees.serviceChargeMax)) {
      return res.status(400).json({ message: "serviceChargeMin cannot be greater than serviceChargeMax" });
    }

    const update = { fees, flags, slides, updatedBy: req.user._id };
    if (logo          !== undefined) update.logo          = logo;
    if (subscriptions !== undefined) update.subscriptions = subscriptions;
    await Config.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true });
  } catch (err) {
    logger.error("saveConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};
