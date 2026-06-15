import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSellerMedia, uploadAvatar } from "../middleware/upload.js";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Service from "../models/Service.js";


const router = express.Router();

// ========================
// 🧩 Become a Seller
// ========================
router.post(
  "/become/seller",
  protect,
  uploadSellerMedia,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // ✅ Add seller role if not already added
      if (!user.roles.includes("seller")) {
        user.roles.push("seller");
      }

      // ✅ Prepare image paths
      const bannerPath = req.files.banner
        ? { url: req.files.banner[0].path, publicId: req.files.banner[0].filename }
        : user.sellerInfo?.banner || "";
      const logoPath = req.files.logo
        ? { url: req.files.logo[0].path, publicId: req.files.logo[0].filename }
        : user.sellerInfo?.logo || "";

      // ✅ Update seller info inside User model
      user.sellerInfo = {
        storeName: req.body.storeName,
        businessName: req.body.businessName,
        bio: req.body.bio,
        banner: bannerPath,
        logo: logoPath,
        category: req.body.category,
        description: req.body.description,
        address: req.body.address,
      };

      await user.save();

      // ✅ Create or update Seller model
      let seller = await Seller.findOne({ user: user._id });

      if (!seller) {
        seller = new Seller({
          user: user._id,
          name: user.name,
          storeName: req.body.storeName,
          businessName: req.body.businessName,
          bio: req.body.bio,
          banner: bannerPath,
          logo: logoPath,
          category: req.body.category ? [req.body.category] : [],
          description: req.body.description,
          address: req.body.address,
        });
      } else {
        // Update existing seller
        seller.storeName = req.body.storeName || seller.storeName;
        seller.businessName = req.body.businessName || seller.businessName;
        seller.bio = req.body.bio || seller.bio;
        seller.banner = bannerPath || seller.banner;
        seller.logo = logoPath || seller.logo;
        seller.category = req.body.category
          ? [req.body.category]
          : seller.category;
        seller.description = req.body.description || seller.description;
        seller.address = req.body.address || seller.address;
      }

      await seller.save();

      // ✅ Respond
      res.json({
        success: true,
        message: "Seller registration successful",
        user,
        seller,
      });
    } catch (error) {
      console.error("Seller registration error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/users/become/service_provider
router.post(
  "/become/service_provider",
  protect,
  uploadAvatar,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Add role if not already assigned
      if (!user.roles.includes("service_provider")) {
        user.roles.push("service_provider");
      }

      const imagePath = req.file ? { url: req.file.path, publicId: req.file.filename } : null;

      // Save brief info to user
      // If a display name was provided, save it to the main user.name (prevents 'Unknown')
      if (req.body.name) {
        user.name = req.body.name.trim();
      }

      // Sync uploaded image as both serviceProvider avatar and global avatar
      if (imagePath) {
        user.avatar = imagePath;
      }

      user.serviceProviderInfo = {
        brandName: req.body.brandName || user.serviceProviderInfo?.brandName,
        title: req.body.title || user.serviceProviderInfo?.title,
        bio: req.body.bio || user.serviceProviderInfo?.bio,
        rate: req.body.rate || user.serviceProviderInfo?.rate,
        portfolio: req.body.portfolio
          ? req.body.portfolio.split(",").map((p) => p.trim())
          : user.serviceProviderInfo?.portfolio || [],
        certifications:
          req.body.certifications
            ? req.body.certifications.split(",").map((c) => c.trim())
            : user.serviceProviderInfo?.certifications || [],
        avatar: imagePath || user.serviceProviderInfo?.avatar || user.avatar || "",
      };

      await user.save();

      // Create or update Service record
      const serviceData = {
        provider: user._id,
        name: user.name || req.body.brandName || req.body.title || "",
        title: req.body.title,
        rate: req.body.rate,
        desc: req.body.desc,
        about: req.body.bio,
        portfolio: req.body.portfolio?.split(",").map((p) => p.trim()) || [],
        certifications:
          req.body.certifications?.split(",").map((c) => c.trim()) || [],
        image: imagePath,
        major: req.body.brandName,
        // provider: user._id, // set above
      };

      const service = new Service(serviceData);
      await service.save();

      res.json({
        success: true,
        message: "Service provider registration successful",
        user,
        service,
      });
    } catch (error) {
      console.error("Service provider registration error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /api/users/provider — provider closes their own profile
router.delete("/provider", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.roles.includes("service_provider"))
      return res.status(400).json({ message: "Not a service provider" });

    const now = new Date();
    await Service.updateMany({ provider: user._id }, { $set: { deletedAt: now } });

    user.roles = user.roles.filter((r) => r !== "service_provider");
    user.serviceProviderInfo = undefined;
    await user.save();

    res.json({ message: "Provider profile closed. Your account remains active." });
  } catch (err) {
    console.error("closeProvider:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

