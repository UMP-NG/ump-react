import User from "../models/User.js";
import PushSub from "../models/PushSub.js";
import logger from "../utils/logger.js";

// Grants the "agent" role — additive, alongside any existing roles (seller,
// service_provider, etc.). Agents manage accommodation/rental Listings via
// the same listingRoutes.js endpoints sellers already use.
export const becomeAgent = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (!req.user.identityVerified) {
      return res.status(403).json({
        message: "You need to complete identity verification before you can become an agent. Submit your verification in Settings.",
      });
    }

    let roles = req.user.roles;
    if (!roles.includes("agent")) {
      const updated = await User.findByIdAndUpdate(req.user._id, { $addToSet: { roles: "agent" } }, { new: true }).select("roles");
      roles = updated.roles;
    }

    // Keep PushSub.roles in sync every time this is called, not only on the
    // first successful grant — a retry (e.g. after a timed-out first call)
    // or a push subscription created after the role was already granted
    // would otherwise leave PushSub stale until the browser's next resubscribe.
    await PushSub.updateMany({ user: req.user._id }, { $set: { roles } });

    res.json({ message: "You're now an agent — manage listings from your Agent Dashboard.", roles });
  } catch (err) {
    logger.error("becomeAgent", err);
    res.status(500).json({ message: "Server error" });
  }
};
