import Feedback from "../models/Feedback.js";
import logger from "../utils/logger.js";

// Public — a shopper who couldn't find what they wanted submits a short note.
// Never fails hard: this is a nice-to-have demand signal, not a critical path.
export const submitFeedback = async (req, res) => {
  try {
    const { message, reason, context, searchQuery } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Please tell us what you're looking for" });
    }
    if (message.length > 500) {
      return res.status(400).json({ message: "Message is too long" });
    }
    await Feedback.create({
      message: message.trim(),
      reason: typeof reason === "string" ? reason.trim().slice(0, 60) : "",
      context: typeof context === "string" ? context.trim().slice(0, 30) : "market",
      searchQuery: typeof searchQuery === "string" ? searchQuery.trim().slice(0, 200) : "",
      user: req.user?._id || null,
    });
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error("submitFeedback:", err.message);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};
