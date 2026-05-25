import Seller from "../models/Seller.js";
import User from "../models/User.js";

export const becomeSeller = async (req, res) => {
  try {
    if (!req.user) {
      console.warn("⛔ No user");
      console.groupEnd();
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

    console.groupEnd();
    return res.json({ success: true, seller });
  } catch (err) {
    console.error("❌ SELLER ERROR:", err);
    console.groupEnd();
    return res.status(500).json({ message: err.message });
  }
};

export const requestSellerVerification = async (req, res) => {
  try {
    const seller = await Seller.findOneAndUpdate(
      { user: req.user._id },
      { verificationRequested: true },
      { new: true }
    );
    if (!seller) return res.status(404).json({ message: "Seller profile not found" });
    res.json({ success: true, message: "Verification request submitted", seller });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSellerProfile = async (req, res) => {
  try {
    if (!req.user) {
      console.warn("⛔ No user attached to request");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const seller = await Seller.findOne({ user: req.user._id });

    if (!seller) {
      console.warn("⚠️ Seller profile NOT found for user:", req.user._id);
      return res.status(404).json({
        message: "Seller profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      seller,
    });
  } catch (err) {
    console.error("❌ GET SELLER PROFILE ERROR:", err);
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

    res.json(seller);
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

    const seller = await Seller.findById(sellerId);
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
    console.error("❌ Follow action error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const unfollowSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.followers = seller.followers.filter(
      (followerId) => followerId.toString() !== user._id.toString()
    );

    await seller.save();
    res.json({ message: "Seller unfollowed successfully" });
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

