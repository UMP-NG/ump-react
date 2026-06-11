import Seller from "../models/Seller.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import PushSub from "../models/PushSub.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

export const becomeSeller = async (req, res) => {
  try {
    if (!req.user) {
      logger.warn("⛔ No user");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.googleAccount && !req.user.isVerified) {
      return res.status(403).json({ message: "Please link your UNILAG email before registering as a seller." });
    }

    let seller = await Seller.findOne({ user: req.user._id });

    const logoFile = req.files?.logo?.[0];
    const bannerFile = req.files?.banner?.[0];

    const logo = logoFile
      ? { url: logoFile.path, publicId: logoFile.filename }
      : undefined;

    const banner = bannerFile
      ? { url: bannerFile.path, publicId: bannerFile.filename }
      : undefined;

    if (!req.user.roles.includes("seller")) {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { roles: "seller" } });
    }

    if (seller) {
      // Update seller
      Object.assign(seller, req.body);
      if (logo) seller.logo = logo;
      if (banner) seller.banner = banner;
      await seller.save();
    } else {
      // Create seller
      seller = await Seller.create({
        user: req.user._id,
        ...req.body,
        logo: logo || { url: "/images/guy.png", publicId: "" },
        banner: banner || { url: "/images/banner-default.jpg", publicId: "" },
      });
    }

    return res.json({ success: true, seller });
  } catch (err) {
    logger.error("❌ SELLER ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const requestSellerVerification = async (req, res) => {
  try {
    const seller = await Seller.findOneAndUpdate(
      { user: req.user._id },
      { subscriptionRequested: true },
      { new: true }
    );
    if (!seller) return res.status(404).json({ message: "Seller profile not found" });

    res.json({ success: true, message: "Subscription request submitted", seller });

    // Fire-and-forget: push notification to all admins
    const storeName = seller.storeName || req.user.name || "A seller";
    User.find({ roles: "admin" }, { _id: 1 }).lean()
      .then((admins) =>
        Promise.all(admins.map((a) =>
          notify(a._id, {
            type:    "system",
            title:   "Verification request",
            message: `${storeName} has requested store verification.`,
            link:    "/admin/sellers",
          })
        ))
      )
      .catch((err) => logger.error("requestSellerVerification notify admins:", err.message));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSellerProfile = async (req, res) => {
  try {
    if (!req.user) {
      logger.warn("⛔ No user attached to request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      logger.warn("⚠️ Seller profile NOT found for user:", req.user._id);
      return res.status(404).json({
        message: "Seller profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      seller,
    });
  } catch (err) {
    logger.error("❌ GET SELLER PROFILE ERROR:", err);
    return res.status(500).json({
      message: "Failed to load seller profile",
    });
  }
};

export const getAllSellers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      const re = { $regex: search, $options: "i" };
      query.$or = [
        { storeName: re },
        { name: re },
        { bio: re },
        { description: re },
        { category: re },
      ];
    }

    const sellers = await Seller.find(query)
      .populate("user", "email role")
      .populate(
        "products",
        "name price image images description category stock rating"
      );
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getSellerById = async (req, res) => {
  try {
    let seller =
      (await Seller.findById(req.params.id)
        .populate("user", "email role")
        .populate(
          "products",
          "name price image images description category stock rating"
        )) ||
      (await Seller.findOne({ user: req.params.id })
        .populate("user", "email role")
        .populate(
          "products",
          "name price image images description category stock rating"
        ));

    if (!seller) return res.status(404).json({ message: "Seller not found" });

    const currentUserId = req.user?._id?.toString();
    const followersArr = seller.followers || [];

    res.json({
      ...seller.toObject(),
      followersCount: followersArr.length,
      isFollowing: currentUserId ? followersArr.some((f) => f.toString() === currentUserId) : false,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const followSeller = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const userId = req.user._id;

    if (sellerId.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Accept both Seller _id and the seller's User _id
    const seller = await Seller.findOne({ $or: [{ _id: sellerId }, { user: sellerId }] });
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    const alreadyFollowing = seller.followers.includes(userId);

    const update = alreadyFollowing
      ? { $pull: { followers: userId } }
      : { $addToSet: { followers: userId } };

    const updatedSeller = await Seller.findByIdAndUpdate(sellerId, update, {
      new: true,
      select: "followers",
    });

    res.json({
      following: !alreadyFollowing,
      followersCount: updatedSeller.followers.length,
    });
  } catch (err) {
    logger.error("❌ Follow action error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const unfollowSeller = async (req, res) => {
  try {
    const seller = await Seller.findOne({ $or: [{ _id: req.params.id }, { user: req.params.id }] });
    const user = await User.findById(req.user._id);

    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.followers = seller.followers.filter(
      (followerId) => followerId.toString() !== user._id.toString()
    );

    await seller.save();
    res.json({ following: false, followersCount: seller.followers.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const incrementSellerView = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    res.json({ message: "Seller view counted", views: seller.views });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Seller closes their own store — deletes products, services, and Seller profile,
// removes the "seller" role, but keeps the user account intact.
// PUT /api/sellers/delivery — seller saves their delivery configuration
export const saveDeliveryConfig = async (req, res) => {
  try {
    const { pickup, selfDelivery, shipbubble } = req.body;

    // Structural validation
    if (pickup !== undefined && typeof pickup.enabled !== "boolean")
      return res.status(400).json({ message: "pickup.enabled must be a boolean" });
    if (selfDelivery !== undefined) {
      if (typeof selfDelivery.enabled !== "boolean")
        return res.status(400).json({ message: "selfDelivery.enabled must be a boolean" });
      if (selfDelivery.enabled && (isNaN(Number(selfDelivery.fee)) || Number(selfDelivery.fee) < 0))
        return res.status(400).json({ message: "selfDelivery.fee must be a non-negative number" });
    }
    if (shipbubble !== undefined && typeof shipbubble.enabled !== "boolean")
      return res.status(400).json({ message: "shipbubble.enabled must be a boolean" });

    const anyEnabled = pickup?.enabled || selfDelivery?.enabled || shipbubble?.enabled;
    if (!anyEnabled)
      return res.status(400).json({ message: "At least one delivery method must be enabled" });

    const update = {};
    if (pickup !== undefined) {
      update["delivery.pickup.enabled"]      = Boolean(pickup.enabled);
      update["delivery.pickup.instructions"] = (pickup.instructions || "").toString().slice(0, 500);
    }
    if (selfDelivery !== undefined) {
      update["delivery.selfDelivery.enabled"]       = Boolean(selfDelivery.enabled);
      update["delivery.selfDelivery.fee"]           = Math.max(0, Number(selfDelivery.fee) || 0);
      update["delivery.selfDelivery.coverage"]      = (selfDelivery.coverage || "").toString().slice(0, 200);
      update["delivery.selfDelivery.estimatedDays"] = (selfDelivery.estimatedDays || "").toString().slice(0, 50);
    }
    if (shipbubble !== undefined) {
      update["delivery.shipbubble.enabled"] = Boolean(shipbubble.enabled);
      if (shipbubble.pickupAddress && typeof shipbubble.pickupAddress === "object") {
        const p = shipbubble.pickupAddress;
        update["delivery.shipbubble.pickupAddress.name"]   = (p.name   || "").toString().slice(0, 100);
        update["delivery.shipbubble.pickupAddress.phone"]  = (p.phone  || "").toString().slice(0, 20);
        update["delivery.shipbubble.pickupAddress.email"]  = (p.email  || "").toString().slice(0, 200);
        update["delivery.shipbubble.pickupAddress.street"] = (p.street || "").toString().slice(0, 300);
        update["delivery.shipbubble.pickupAddress.city"]   = (p.city   || "").toString().slice(0, 100);
        update["delivery.shipbubble.pickupAddress.state"]  = (p.state  || "").toString().slice(0, 100);
      }
    }

    const seller = await Seller.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { new: true }
    );
    if (!seller) return res.status(404).json({ message: "Seller profile not found" });

    res.json({ success: true, delivery: seller.delivery });
  } catch (err) {
    logger.error("saveDeliveryConfig:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const closeStore = async (req, res) => {
  try {
    const userId = req.user._id;
    const seller = await Seller.findOne({ user: userId });
    if (!seller) return res.status(404).json({ message: "Store not found" });

    const now = new Date();
    await Promise.allSettled([
      Product.updateMany({ seller: userId }, { $set: { deletedAt: now } }),
      Service.updateMany({ provider: userId }, { $set: { deletedAt: now } }),
      User.findByIdAndUpdate(userId, { $pull: { roles: { $in: ["seller", "service_provider"] } } }),
      PushSub.updateMany({ user: userId }, { $pull: { roles: { $in: ["seller", "service_provider"] } } }),
    ]);
    await seller.deleteOne();

    res.json({ message: "Store closed. Your account remains active." });
  } catch (err) {
    logger.error("closeStore:", err);
    res.status(500).json({ message: "Server error" });
  }
};

