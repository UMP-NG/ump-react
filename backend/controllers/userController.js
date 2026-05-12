import User from "../models/User.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import cloudinary from "../config/cloudinary.js";

// ===============================
// GET current logged-in user profile
// ===============================
export const getCurrentUserProfile = async (req, res) => {
  try {
    // ✅ Use req.user from auth middleware (already fetched) - NO re-query
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// UPDATE current logged-in user profile
// ===============================
export const updateUserProfile = async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Whitelist allowed fields to prevent injection attacks
    const { name, phone, address, bio, dateOfBirth, gender, website, avatar, notificationPreferences } =
      req.body;

    // Update only provided fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (bio !== undefined) user.bio = bio;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    if (website !== undefined) user.website = website;
    if (notificationPreferences !== undefined && typeof notificationPreferences === "object") {
      user.notificationPreferences = { ...user.notificationPreferences, ...notificationPreferences };
    }

    // Handle avatar - if it's a string, treat it as URL
    if (avatar !== undefined) {
      if (typeof avatar === "string") {
        user.avatar = { url: avatar, publicId: "" };
      } else if (typeof avatar === "object" && avatar !== null) {
        user.avatar = avatar;
      }
    }

    // Save with validation
    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ ERROR in updateUserProfile:");
    console.error("   Error name:", error.name);
    console.error("   Error message:", error.message);
    console.error("   Error code:", error.code);
    console.error("   Full error:", error);

    // Handle specific errors
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ message: "Validation error: " + messages });
    }

    res.status(500).json({
      message: "Server error",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// ===============================
// GET all users (admin only)
// ===============================
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = {};
    if (role) {
      // role can be: user, seller, service_provider, admin
      query.roles = { $in: [role] };
    }

    const users = await User.find(query)
      .select("-password -wishlist -cart -orders -services -following")
      .limit(100)
      .lean();
      
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// GET single user by ID
// ===============================
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// DELETE current user (self)
// ===============================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.remove();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// FOLLOW / UNFOLLOW users
// ===============================
export const followUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id)
      return res.status(400).json({ message: "You cannot follow yourself" });

    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.followers.includes(currentUser._id))
      return res.status(400).json({ message: "Already following this user" });

    user.followers.push(currentUser._id);
    currentUser.following.push(user._id);

    await user.save();
    await currentUser.save();

    res.json({ message: "User followed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.followers = user.followers.filter(
      (followerId) => followerId.toString() !== currentUser._id.toString()
    );
    currentUser.following = currentUser.following.filter(
      (followingId) => followingId.toString() !== user._id.toString()
    );

    await user.save();
    await currentUser.save();

    res.json({ message: "User unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// WISHLIST
// ===============================
export const addToWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const user = await User.findById(req.user._id);
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    res.json({ message: "Added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId.toString()
    );
    await user.save();
    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// CART
// ===============================
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user._id);

    const cartItem = user.cart.find(
      (item) => item.product.toString() === productId
    );

    if (cartItem) {
      cartItem.quantity += quantity || 1;
    } else {
      user.cart.push({ product: productId, quantity: quantity || 1 });
    }

    await user.save();
    res.json({ message: "Added to cart" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.user._id);

    const cartItem = user.cart.find(
      (item) => item.product.toString() === req.params.productId
    );
    if (!cartItem) return res.status(404).json({ message: "Item not in cart" });

    cartItem.quantity = quantity;
    await user.save();
    res.json({ message: "Cart updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const user = await User.findById(req.user._id);

    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );
    await user.save();
    res.json({ message: "Removed from cart" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// NOTIFICATIONS
// ===============================
export const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const notifIndex = user.notifications.findIndex(
      (n) => n._id.toString() === req.params.notificationId
    );
    if (notifIndex === -1)
      return res.status(404).json({ message: "Notification not found" });

    user.notifications[notifIndex].read = true;
    await user.save();
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// BECOME SERVICE PROVIDER
// ===============================
export const becomeServiceProvider = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Add 'service_provider' role
    if (!user.roles) user.roles = [];
    if (!user.roles.includes("service_provider")) {
      user.roles.push("service_provider");
    }

    // Optional: add or update service details
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

    const serviceData = {
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
      timeSlots: Array.isArray(timeSlots)
        ? timeSlots
        : timeSlots
        ? [timeSlots]
        : [],
      isAvailable: available === "on" || available === true,
      image: req.file
        ? { url: req.file.path, publicId: req.file.filename }
        : null,
      createdAt: new Date(),
    };

    // Create a Service document and link it to the user
    const service = await Service.create({
      provider: user._id,
      name: serviceData.name || user.name || "",
      title: serviceData.title || "",
      major: serviceData.major || "",
      desc: serviceData.desc || "",
      about: serviceData.about || "",
      rate: serviceData.rate || 0,
      currency: serviceData.currency || "NGN",
      package: serviceData.package || "",
      duration: serviceData.duration || 0,
      certifications: serviceData.certifications || [],
      portfolio: serviceData.portfolio || [],
      policies: serviceData.policies || [],
      tags: serviceData.tags || [],
      timeSlots: serviceData.timeSlots || [],
      available: serviceData.isAvailable,
      image: serviceData.image,
    });

    // ensure user.services is an array of ObjectId refs
    if (!user.services) user.services = [];
    user.services.push(service._id);

    // Update serviceProviderInfo on user (non-sensitive fields)
    user.serviceProviderInfo = user.serviceProviderInfo || {};
    user.serviceProviderInfo.businessName =
      user.serviceProviderInfo.businessName || serviceData.name || user.name;
    user.serviceProviderInfo.skills =
      serviceData.tags && serviceData.tags.length
        ? serviceData.tags
        : user.serviceProviderInfo.skills || [];
    user.serviceProviderInfo.rate =
      serviceData.rate || user.serviceProviderInfo.rate;
    user.serviceProviderInfo.bio =
      serviceData.about || user.serviceProviderInfo.bio || "";

    await user.save();

    res.status(200).json({
      success: true,
      message: "User is now a service provider",
      user,
      service,
    });
  } catch (error) {
    console.error("❌ Error becoming service provider:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateWalkerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update name if provided and not blank
    const name = req.body.name?.trim();
    if (name) {
      user.name = name; // top-level name for display
      user.walkerInfo.name = name; // walker-specific name
    }

    // Update avatar if file uploaded
    if (req.file) {
      const avatarPath = { url: req.file.path, publicId: req.file.filename };
      user.avatar = avatarPath; // top-level avatar
      user.walkerInfo.avatar = avatarPath;
    }

    await user.save();

    res.status(200).json({
      walkerInfo: user.walkerInfo,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("❌ updateWalkerProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
