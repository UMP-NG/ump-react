import Config from "../models/Config.js";
import logger from "../utils/logger.js";

// Public — returns only logo and hero slides; no pricing or business config
export const publicConfig = async (req, res) => {
  try {
    const config = await Config.findOne().select("logo slides").lean();
    if (!config) return res.json({ logo: {}, slides: [] });
    res.json({ logo: config.logo || {}, slides: config.slides || [] });
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
