import Config from "../models/Config.js";
import logger from "../utils/logger.js";

// Public — returns logo, slides, flags, and buyer-facing fee settings (not internal seller fees)
export const publicConfig = async (req, res) => {
  try {
    const config = await Config.findOne().select("logo slides flags fees").lean();
    if (!config) return res.json({ logo: {}, slides: [], flags: {}, fees: {} });
    const { fees } = config;
    // Only expose buyer-facing fields — never expose platformFee/platformFeeEnabled
    const publicFees = fees ? {
      serviceChargeEnabled: fees.serviceChargeEnabled ?? true,
      serviceFee:           fees.serviceFee           ?? 5.0,
      serviceChargeMin:     fees.serviceChargeMin      ?? 100,
      serviceChargeMax:     fees.serviceChargeMax      ?? 2000,
    } : {};
    res.json({ logo: config.logo || {}, slides: config.slides || [], flags: config.flags || {}, fees: publicFees });
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

export const saveConfig = async (req, res) => {
  try {
    const { fees, flags, slides, logo, subscriptions } = req.body;
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
