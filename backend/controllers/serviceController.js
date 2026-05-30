import Service from "../models/Service.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

// ===============================
// GET services owned by current user
// ===============================
export const getMyServices = async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, services });
  } catch (error) {
    console.error("getMyServices error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load services" });
  }
};

// Become Service Provider (update role + optional first service)
export const becomeServiceProvider = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.googleAccount && !user.isVerified) {
      return res.status(403).json({ message: "Please link your UNILAG email before registering as a service provider." });
    }

    if (!user.roles) user.roles = [];
    if (!user.roles.includes("service_provider")) user.roles.push("service_provider");

    // Save provider profile — individual services are created separately from the dashboard
    const {
      businessName, headline, bio, categories, yearsExperience,
      location, whatsapp, portfolioUrl, instagram, twitter, avatarUrl,
    } = req.body;

    if (!businessName?.trim()) {
      return res.status(400).json({ message: "Your name or business name is required." });
    }

    if (!user.serviceProviderInfo) user.serviceProviderInfo = {};
    if (businessName)    user.serviceProviderInfo.businessName    = businessName.trim();
    if (headline)        user.serviceProviderInfo.headline        = headline.trim();
    if (bio)             user.serviceProviderInfo.bio             = bio.trim();
    if (location)        user.serviceProviderInfo.location        = location.trim();
    if (whatsapp)        user.serviceProviderInfo.whatsapp        = whatsapp.trim();
    if (portfolioUrl)    user.serviceProviderInfo.portfolioUrl    = portfolioUrl.trim();
    if (instagram)       user.serviceProviderInfo.instagram       = instagram.trim();
    if (twitter)         user.serviceProviderInfo.twitter         = twitter.trim();
    if (yearsExperience !== undefined) user.serviceProviderInfo.yearsExperience = Math.max(0, Number(yearsExperience) || 0);
    if (categories) {
      user.serviceProviderInfo.categories = Array.isArray(categories)
        ? categories : categories.split(",").map((c) => c.trim()).filter(Boolean);
    }

    // Profile photo uploaded via /api/upload and passed as avatarUrl
    const avatarFile = req.file;
    if (avatarFile) {
      user.avatar = { url: avatarFile.path, publicId: avatarFile.filename };
    } else if (avatarUrl) {
      user.avatar = { url: avatarUrl, publicId: "" };
    }

    if (businessName && !user.name) user.name = businessName.trim();

    await user.save();

    res.status(200).json({ success: true, message: "Provider profile saved. You can now add services from your dashboard.", user });
  } catch (error) {
    console.error("❌ becomeServiceProvider error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ===============================
// CREATE a new service
// ===============================
export const createService = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name, title, major, desc, about,
      pricingType, rate, currency, duration,
      certifications, portfolio, policies, tags,
      timeSlots, available,
      videoUrl, videoPublicId,
    } = req.body;

    // Structured time slots: [{day, startTime, endTime}]
    let parsedTimeSlots = [];
    if (timeSlots) {
      try {
        parsedTimeSlots = Array.isArray(timeSlots) ? timeSlots : JSON.parse(timeSlots);
      } catch { parsedTimeSlots = []; }
    }

    // Images — max 5
    let images = [];
    if (req.files?.images) {
      images = req.files.images.slice(0, 5).map((f) => ({ url: f.path, publicId: f.filename }));
    } else if (req.body.images) {
      const imgs = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      // Accept both plain URL strings and {url, publicId} objects (frontend pre-uploads then sends objects)
      images = imgs.slice(0, 5).map((img) =>
        typeof img === "string" ? { url: img, publicId: "" } : { url: img.url, publicId: img.publicId || "" }
      );
    }

    // Video — single file
    let video = undefined;
    if (req.files?.video?.[0]) {
      video = { url: req.files.video[0].path, publicId: req.files.video[0].filename };
    } else if (videoUrl) {
      video = { url: videoUrl, publicId: videoPublicId || "" };
    }

    const splitArr = (v) => v ? (Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean)) : [];

    const service = await Service.create({
      provider: user._id,
      name: name || user.serviceProviderInfo?.businessName || user.name,
      title,
      major,
      desc,
      about,
      pricingType: pricingType || "fixed",
      rate: Number(rate) || 0,
      currency: currency || "NGN",
      duration: duration || "",
      certifications: splitArr(certifications),
      portfolio: splitArr(portfolio),
      policies: splitArr(policies),
      tags: splitArr(tags),
      timeSlots: parsedTimeSlots,
      available: available === "on" || available === true || available === "true",
      images,
      ...(video && { video }),
    });

    // Link service to user and ensure role in one save
    try {
      if (!user.services) user.services = [];
      user.services.push(service._id);
      if (!user.roles?.includes("service_provider")) {
        user.roles = [...new Set([...(user.roles || []), "service_provider"])];
      }
      await user.save();
    } catch (linkErr) {
      console.warn("⚠️ Could not update user after service creation:", linkErr);
    }

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("❌ Error creating service:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ===============================
// GET all service providers (public browse page)
// Query Users first so providers with zero services still appear
// ===============================
export const getAllProviders = async (req, res) => {
  try {
    // 1. All users who have the service_provider role
    const users = await User.find({ roles: "service_provider" })
      .select("name avatar serviceProviderInfo")
      .lean();

    if (!users.length) return res.json({ success: true, providers: [] });

    // 2. Service stats (count, avg rating, categories) per provider — one aggregate query
    const userIds = users.map((u) => u._id);
    const stats = await Service.aggregate([
      { $match: { provider: { $in: userIds } } },
      { $group: {
        _id:          "$provider",
        serviceCount: { $sum: 1 },
        avgRating:    { $avg: "$rating" },
        categories:   { $addToSet: "$major" },
        verified:     { $max: "$verified" },
        available:    { $max: "$available" },
      }},
    ]);

    const statsMap = {};
    stats.forEach((s) => { statsMap[s._id.toString()] = s; });

    // 3. Merge user profile + service stats
    const providers = users.map((u) => {
      const sp  = u.serviceProviderInfo || {};
      const st  = statsMap[u._id.toString()] || {};
      // Merge categories from service stats + provider-registered categories
      const cats = [...new Set([
        ...(st.categories || []),
        ...(sp.categories || []),
      ].filter(Boolean))];
      return {
        _id:             u._id,
        name:            u.name,
        avatar:          u.avatar,
        businessName:    sp.businessName || u.name,
        headline:        sp.headline || "",
        bio:             sp.bio || "",
        categories:      cats,
        yearsExperience: sp.yearsExperience || 0,
        location:        sp.location || "",
        portfolioUrl:    sp.portfolioUrl || "",
        instagram:       sp.instagram || "",
        twitter:         sp.twitter || "",
        verified:        st.verified || false,
        available:       st.available || false,
        serviceCount:    st.serviceCount || 0,
        avgRating:       st.avgRating ? Math.round(st.avgRating * 10) / 10 : 0,
      };
    });

    res.json({ success: true, providers });
  } catch (err) {
    console.error("getAllProviders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET a single provider's profile + all their services
// ===============================
export const getProviderById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, roles: "service_provider" })
      .select("name avatar serviceProviderInfo roles")
      .lean();
    if (!user) return res.status(404).json({ message: "Provider not found" });

    const services = await Service.find({ provider: req.params.id }).lean();
    const sp = user.serviceProviderInfo || {};

    res.json({
      success: true,
      provider: {
        _id:          user._id,
        name:         user.name,
        avatar:       user.avatar,
        businessName: sp.businessName || user.name,
        headline:     sp.headline || "",
        bio:          sp.bio || "",
        categories:   sp.categories || [],
        yearsExperience: sp.yearsExperience || 0,
        location:     sp.location || "",
        whatsapp:     sp.whatsapp || "",
        portfolioUrl: sp.portfolioUrl || "",
        instagram:    sp.instagram || "",
        twitter:      sp.twitter || "",
        verified:     sp.verified || false,
      },
      services,
    });
  } catch (err) {
    console.error("getProviderById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET all services
// ===============================
export const getAllServices = async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = {};

    if (search) {
      const re = { $regex: search, $options: "i" };
      query.$or = [{ name: re }, { title: re }, { desc: re }, { tags: re }];
    }

    if (category) {
      query.major = { $regex: `^${category}$`, $options: "i" };
    }

    const services = await Service.find(query).populate(
      "provider",
      "name email roles avatar serviceProviderInfo"
    );

    res.json({ success: true, count: services.length, services });
  } catch (error) {
    console.error("❌ Error fetching services:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET single service by ID
// ===============================
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("provider", "name email roles avatar serviceProviderInfo")
      .populate({
        path: "reviews",
        // Review schema uses `author` as the user reference
        populate: { path: "author", select: "name email avatar" },
      });

    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    const userId = req.user?._id?.toString();
    const providerId = service.provider?._id?.toString();

    if (userId && userId !== providerId) {
      service.views = (service.views || 0) + 1;
      service.viewedBy = [...(service.viewedBy || []), userId];
      await service.save();
    } else if (!userId) {
      service.views = (service.views || 0) + 1;
      await service.save();
    }

    res.status(200).json({ success: true, service });
  } catch (error) {
    console.error("❌ Error fetching service:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// UPDATE service by ID
// ===============================
export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    if (
      service.provider.toString() !== req.user._id.toString() &&
      !req.user.roles?.includes("admin")
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const updates = { ...req.body };
    if (req.files && req.files.images) {
      updates.images = req.files.images.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));
    } else if (Array.isArray(updates.images)) {
      // Normalize: accept [{url, publicId}] objects or plain URL strings
      updates.images = updates.images.map((img) =>
        typeof img === "string" ? { url: img, publicId: "" } : { url: img.url, publicId: img.publicId || "" }
      );
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({ success: true, service: updatedService });
  } catch (error) {
    console.error("❌ Error updating service:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// DELETE service by ID
// ===============================
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service)
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });

    if (
      service.provider.toString() !== req.user._id.toString() &&
      !req.user.roles?.includes("admin")
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Delete images from Cloudinary if they exist
    if (service.images && service.images.length > 0) {
      for (const img of service.images) {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId, {
            resource_type: "image",
          });
        }
      }
    }

    await service.deleteOne();

    // Remove reference from user's services array if present
    try {
      const owner = await User.findById(service.provider);
      if (owner && Array.isArray(owner.services)) {
        owner.services = owner.services.filter(
          (sid) => sid.toString() !== service._id.toString()
        );
        await owner.save();
      }
    } catch (remErr) {
      console.warn("⚠️ Could not remove service reference from user:", remErr);
    }

    res.json({ success: true, message: "Service deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting service:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const requestServiceVerification = async (req, res) => {
  try {
    const service = await Service.findOneAndUpdate(
      { provider: req.user._id },
      { verificationRequested: true },
      { new: true }
    );
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json({ success: true, message: "Verification request submitted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

