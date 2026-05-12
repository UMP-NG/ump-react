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

    // ✅ Add 'service_provider' to roles array
    if (!user.roles) user.roles = [];
    if (!user.roles.includes("service_provider")) {
      user.roles.push("service_provider");
    }

    // Optionally allow adding first service here
    if (req.body.name || req.body.title) {
      try {
        // Parse timeSlots safely
        let timeSlots = [];
        if (req.body.timeSlots) {
          try {
            timeSlots = Array.isArray(req.body.timeSlots)
              ? req.body.timeSlots
              : JSON.parse(req.body.timeSlots);
          } catch {
            timeSlots = [];
          }
        }

        // Create a Service document (not embedded in User)
        const serviceData = {
          name: req.body.name,
          title: req.body.title,
          major: req.body.major,
          desc: req.body.desc,
          about: req.body.about,
          rate: Number(req.body.rate) || 0,
          currency: req.body.currency || "NGN",
          package: req.body.package || "",
          duration: Number(req.body.duration) || 0,
          certifications: req.body.certifications
            ? req.body.certifications.split(",").map((c) => c.trim())
            : [],
          portfolio: req.body.portfolio
            ? req.body.portfolio.split(",").map((p) => p.trim())
            : [],
          policies: req.body.policies
            ? req.body.policies.split(",").map((p) => p.trim())
            : [],
          tags: req.body.tags
            ? req.body.tags.split(",").map((t) => t.trim())
            : [],
          timeSlots: timeSlots,
          isAvailable: req.body.available === "on" || req.body.available === true,
          images: req.file
            ? [{ url: req.file.path, publicId: req.file.filename }]
            : req.body.serviceImageUrl
            ? [{ url: req.body.serviceImageUrl, publicId: "" }]
            : [],
          provider: req.user._id,  // Reference to the provider (user)
        };

        // Create the Service document
        const service = await Service.create(serviceData);

        // Push the Service ID to user.services array (if the field exists)
        if (!user.services) user.services = [];
        user.services.push(service._id);
      } catch (serviceErr) {
        console.error("⚠️ Error creating first service:", serviceErr);
        // Don't fail the whole request if service creation fails
        // The user still gets the service_provider role
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User is now a service provider",
      user,
    });
  } catch (error) {
    console.error("❌ Error becoming service provider:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
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
      name,
      title,
      major,
      desc,
      about,
      rate,
      currency,
      package: pkg,
      duration,
      certifications,
      portfolio,
      policies,
      tags,
      timeSlots,
      available,
    } = req.body;

    const parsedTimeSlots = timeSlots
      ? Array.isArray(timeSlots)
        ? timeSlots
        : [timeSlots]
      : [];

    const isAvailable = available === "on" || available === true;

    // Handle uploaded image(s) - now supporting multiple images
    let images = [];
    if (req.files && req.files.images) {
      images = req.files.images.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));
    }

    const service = await Service.create({
      provider: user._id,
      name,
      title,
      major,
      desc,
      about,
      rate: Number(rate) || 0,
      currency: currency || "NGN",
      package: pkg || "",
      duration: Number(duration) || 0,
      certifications: certifications
        ? certifications.split(",").map((c) => c.trim())
        : [],
      portfolio: portfolio ? portfolio.split(",").map((p) => p.trim()) : [],
      policies: policies ? policies.split(",").map((p) => p.trim()) : [],
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      timeSlots: parsedTimeSlots,
      isAvailable,
      images,
    });

    // Link service id to user's services array for easy lookup
    try {
      if (!user.services) user.services = [];
      user.services.push(service._id);
      await user.save();
    } catch (linkErr) {
      console.warn("⚠️ Could not link service to user.services:", linkErr);
    }
    // Update user role to service provider if not already
    if (user.role !== "service_provider") {
      user.role = "service_provider";
      await user.save();
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
      "name email role businessName brandName storeName"
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
      .populate("provider", "name email role avatar")
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
      req.user.role !== "admin"
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
      req.user.role !== "admin"
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
