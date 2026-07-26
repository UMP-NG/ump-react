import Visit from "../models/Visit.js";
import logger from "../utils/logger.js";

// Public, fire-and-forget style — records one site-visit ping per browser session.
// Never fails hard: a tracking hiccup should never affect the page load.
export const recordVisit = async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId || typeof visitorId !== "string" || visitorId.length > 100) {
      return res.status(204).end();
    }
    await Visit.create({ visitorId, userId: req.user?._id || null });
    res.status(204).end();
  } catch (err) {
    logger.error("recordVisit:", err.message);
    res.status(204).end();
  }
};
