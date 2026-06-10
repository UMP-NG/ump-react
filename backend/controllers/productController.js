import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Seller from "../models/Seller.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createProduct = async (req, res) => {
  try {
    const { name, desc, price, category, condition, colors, deliveryFee, stock } = req.body;

    // --- 🎨 Parse Colors safely ---
    let parsedColors = [];
    if (colors) {
      try {
        parsedColors = Array.isArray(colors) ? colors : JSON.parse(colors);
        parsedColors = parsedColors
          .map((c) => {
            if (typeof c === "string") return { name: c, code: "" };
            if (c && typeof c === "object") {
              return {
                name: c.name || "",
                code: c.code && /^#[0-9A-Fa-f]{6}$/.test(c.code) ? c.code : "",
              };
            }
            return null;
          })
          .filter(Boolean);
      } catch {
        parsedColors = [];
      }
    }

    // --- 🧩 Build Specs safely ---
    let specs = {};
    if (req.body.specKey && req.body.specValue) {
      const keys = Array.isArray(req.body.specKey)
        ? req.body.specKey
        : [req.body.specKey];
      const values = Array.isArray(req.body.specValue)
        ? req.body.specValue
        : [req.body.specValue];
      keys.forEach((key, i) => {
        if (key && values[i]) specs[key] = values[i];
      });
    } else if (req.body.specs && typeof req.body.specs === "object") {
      specs = req.body.specs;
    }

    // --- 🖼️ Handle Uploaded Images safely ---
    const images =
      req.files?.images && Array.isArray(req.files.images)
        ? req.files.images.map((file) => ({
            url: file.path,
            publicId: file.filename,
          }))
        : [];

    // --- ✅ Create Product ---
    const product = await Product.create({
      name,
      desc,
      price,
      category,
      condition,
      colors: parsedColors,
      specs,
      images,
      seller: req.user?._id,
      deliveryFee: Math.max(0, Number(deliveryFee) || 0),
      stock: stock !== undefined && stock !== "" ? Math.max(0, Number(stock)) : 1,
    });

    // --- ✅ Link product to seller's products array ---
    if (req.user?._id) {
      try {
        const seller = await Seller.findOne({ user: req.user._id });
        if (seller) {
          // Check if product already in array (avoid duplicates)
          if (!seller.products.includes(product._id)) {
            seller.products.push(product._id);
            await seller.save();
          }
        } else {
          logger.warn("⚠️ Seller profile not found for user:", req.user._id);
        }
      } catch (sellerErr) {
        logger.error("❌ Error linking product to seller:", sellerErr);
        // Don't fail the request, just log the error
      }
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    logger.error("❌ Error creating product:", error);

    if (error.name === "MulterError") {
      return res.status(400).json({
        success: false,
        message: "Image upload failed",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// ✅ Get all products belonging to the logged-in seller
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .populate("category", "name")
      .select("-viewedBy -reviews")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    logger.error("❌ Error fetching seller products:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching seller products",
    });
  }
};

// ✅ Get all products (with optional filters)
export const getAllProducts = async (req, res) => {
  try {
    // Coerce to strings — query params can arrive as arrays when a key repeats
    const category  = typeof req.query.category  === "string" ? req.query.category  : "";
    const keyword   = typeof req.query.keyword   === "string" ? req.query.keyword   : "";
    const search    = typeof req.query.search    === "string" ? req.query.search    : "";
    const condition = typeof req.query.condition === "string" ? req.query.condition : "";
    const sort      = typeof req.query.sort      === "string" ? req.query.sort      : "";
    const minPrice  = req.query.minPrice;
    const maxPrice  = req.query.maxPrice;
    const limit     = req.query.limit;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const skip = typeof req.query.skip === "string" ? Math.max(0, parseInt(req.query.skip, 10) || 0) : 0;

    let query = { deletedAt: null };

    if (category) {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.category = new mongoose.Types.ObjectId(category);
      } else {
        const Category = (await import("../models/Category.js")).default;
        const cat = await Category.findOne({
          $or: [
            { slug: category.toLowerCase() },
            { name: { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") } },
          ],
        }).lean();
        if (cat) {
          query.category = cat._id;
        } else {
          return res.status(200).json({ success: true, count: 0, products: [] });
        }
      }
    }

    const searchTerm = search || keyword;
    if (searchTerm.trim()) {
      if (searchTerm.length > 200)
        return res.status(400).json({ success: false, message: "Search query is too long" });
      query.name = { $regex: escapeRegex(searchTerm.trim()), $options: "i" };
    }

    if (condition && condition !== "all") query.condition = { $regex: `^${escapeRegex(condition)}$`, $options: "i" };

    if (minPrice || maxPrice)
      query.price = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
      };

    const isRandom = !sort || sort === "random";
    let products;

    if (isRandom) {
      // Use $sample for true random selection across the full matching dataset
      const [sampled, total] = await Promise.all([
        Product.aggregate([
          { $match: query },
          { $sample: { size: safeLimit } },
          { $project: { viewedBy: 0, reviews: 0 } },
        ]),
        Product.countDocuments(query),
      ]);
      products = await Product.populate(sampled, [
        { path: "seller",   select: "name email storeName", model: "User" },
        { path: "category", select: "name",                 model: "Category" },
      ]);
      return res.status(200).json({ success: true, count: products.length, total, products });
    } else {
      // Secondary _id sort ensures stable ordering across pages
      let sortObj = { createdAt: -1, _id: -1 };
      if (sort === "oldest")                                   sortObj = { createdAt:  1, _id:  1 };
      else if (sort === "price-asc"  || sort === "price_asc") sortObj = { price:      1, _id: -1 };
      else if (sort === "price-desc" || sort === "price_desc") sortObj = { price:     -1, _id: -1 };
      else if (sort === "newest")                              sortObj = { createdAt: -1, _id: -1 };

      const [fetchedProducts, total] = await Promise.all([
        Product.find(query)
          .populate("seller",   "name email storeName")
          .populate("category", "name")
          .select("-viewedBy -reviews")
          .sort(sortObj)
          .lean()
          .skip(skip)
          .limit(safeLimit),
        Product.countDocuments(query),
      ]);
      products = fetchedProducts;
      return res.status(200).json({ success: true, count: products.length, total, products });
    }
  } catch (error) {
    logger.error("❌ Error fetching products:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch products" });
  }
};

// ===============================
// GET PRODUCTS BY CATEGORY ID
// ===============================
export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const products = await Product.find({ category: categoryId })
      .populate("seller", "name email storeName")
      .populate("category", "name")
      .populate("reviews")
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    logger.error("❌ Error fetching products by category:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch products",
      products: []
    });
  }
};

// ✅ Get single product by ID
export const getProductById = async (req, res) => {
  try {
    const userId = req.user?._id?.toString();

    // Reject non-ObjectId values (e.g. "new", "edit") before hitting Mongoose
    const mongoose = (await import("mongoose")).default;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const product = await Product.findById(req.params.id)
      .populate({
        path: "seller",
        select: "name email storeName avatar bio followers description sellerInfo",
        model: "User",
      })
      .populate("category", "name")
      .select("-reviews -viewedBy -likes")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🧠 Track views asynchronously (don't block response)
    const sellerId = product.seller?._id?.toString();
    if (!(userId && userId === sellerId)) {
      // Only track if NOT the seller viewing their own product
      // Do this without awaiting so response sends immediately
      (async () => {
        try {
          if (userId) {
            // Logged-in user: check if already viewed
            const alreadyViewed = product.viewedBy?.some(
              (viewerId) => viewerId.toString?.() === userId || viewerId === userId
            );
            if (!alreadyViewed) {
              await Product.updateOne(
                { _id: req.params.id },
                {
                  $inc: { views: 1 },
                  $push: { viewedBy: userId },
                }
              );
            }
          } else {
            // Guest user: always increment
            await Product.updateOne(
              { _id: req.params.id },
              { $inc: { views: 1 } }
            );
          }
        } catch (err) {
          logger.error("⚠️ Error tracking view:", err);
        }
      })();
    }

    // Fetch Seller profile for address, sellerProfileId, and correct follower count
    // Select followers array only when needed for isFollowing check; followersCount for display
    const sellerProfile = await Seller.findOne({ user: product.seller._id })
      .select(userId ? "_id storeName address location logo followers followersCount" : "_id storeName address location logo followersCount")
      .lean();

    const isUserFollowing = userId && sellerProfile
      ? sellerProfile.followers?.some((f) => f.toString?.() === userId || f === userId)
      : false;

    const normalized = {
      ...product,
      reviews: [],
      seller: {
        _id: product.seller._id,
        sellerProfileId: sellerProfile?._id || null,
        name: product.seller.name,
        email: product.seller.email,
        storeName:
          sellerProfile?.storeName ||
          product.seller.sellerInfo?.storeName ||
          product.seller.name ||
          "Unknown Seller",
        description:
          product.seller.sellerInfo?.description ||
          product.seller.bio ||
          "No seller story yet",
        logo: sellerProfile?.logo?.url || product.seller.avatar || "../images/guy.png",
        followerCount: sellerProfile?.followersCount ?? sellerProfile?.followers?.length ?? product.seller.followers?.length ?? 0,
        bio: product.seller.bio || "No bio available",
        address: sellerProfile?.address || sellerProfile?.location || "",
        isFollowing: isUserFollowing,
      },
    };

    res.status(200).json({
      success: true,
      product: normalized,
    });
  } catch (error) {
    logger.error("❌ Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // --- Update text fields (numeric fields coerced to avoid NaN in DB)
    const textFields = ["name", "status", "desc", "category", "condition"];
    for (const key of textFields) {
      if (req.body[key] !== undefined) product[key] = req.body[key];
    }
    if (req.body.price !== undefined) {
      const p = Number(req.body.price);
      if (!isNaN(p) && p >= 0) product.price = p;
    }
    if (req.body.stock !== undefined && req.body.stock !== "") {
      const s = Math.floor(Number(req.body.stock));
      if (!isNaN(s) && s >= 0) product.stock = s;
    }

    // --- Update specs
    if (req.body.specKey && req.body.specValue) {
      const keys = Array.isArray(req.body.specKey)
        ? req.body.specKey
        : [req.body.specKey];
      const values = Array.isArray(req.body.specValue)
        ? req.body.specValue
        : [req.body.specValue];
      product.specs = {};
      keys.forEach((k, i) => k && values[i] && (product.specs[k] = values[i]));
    } else if (req.body.specs && typeof req.body.specs === "object") {
      product.specs = req.body.specs;
    }

    // --- Flash sale fields
    const oldPrice = product.price;
    const oldSalePrice = product.salePrice;
    if (req.body.salePrice !== undefined) {
      const sp = req.body.salePrice === null || req.body.salePrice === "" ? null : Number(req.body.salePrice);
      product.salePrice = (!isNaN(sp) && sp != null && sp >= 0) ? sp : null;
    }
    if (req.body.saleEndsAt !== undefined) {
      product.saleEndsAt = req.body.saleEndsAt || null;
    }

    // --- Colors normalization
    if (req.body.colors) {
      const colors = Array.isArray(req.body.colors)
        ? req.body.colors
        : JSON.parse(req.body.colors);
      product.colors = colors.map((c) =>
        typeof c === "object"
          ? { name: c.name || String(c), code: c.code || "" }
          : { name: String(c), code: "" }
      );
    }

    // --- Handle images
    product.images = Array.isArray(product.images) ? product.images : [];

    // Remove images from Cloudinary & DB
    let removeImages = [];
    if (req.body.removeImages) {
      try {
        removeImages = Array.isArray(req.body.removeImages)
          ? req.body.removeImages
          : JSON.parse(req.body.removeImages);
      } catch {
        removeImages = String(req.body.removeImages)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // Remove from DB
      product.images = product.images.filter(
        (img) => !removeImages.includes(img.publicId)
      );

      // Remove from Cloudinary
      for (const publicId of removeImages) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
        });
      }
    }

    // Add new uploads
    let uploadedImages = [];
    if (req.files?.images && Array.isArray(req.files.images)) {
      uploadedImages = req.files.images.map((f) => ({
        url: f.path,
        publicId: f.filename,
      }));
    }

    // Replace or merge
    product.images =
      req.body.replaceImages === "true" || req.body.replaceImages === true
        ? uploadedImages
        : [...product.images, ...uploadedImages];

    // --- Save
    const updatedProduct = await product.save();

    // Notify price-drop watchers if effective price dropped
    const newEffective = updatedProduct.salePrice != null && updatedProduct.salePrice < updatedProduct.price
      ? updatedProduct.salePrice : updatedProduct.price;
    const oldEffective = oldSalePrice != null && oldSalePrice < oldPrice ? oldSalePrice : oldPrice;
    if (newEffective < oldEffective && updatedProduct.priceWatchers?.length > 0) {
      const savings = Math.round(((oldEffective - newEffective) / oldEffective) * 100);
      for (const watcher of updatedProduct.priceWatchers) {
        if (watcher.priceAtSubscription > newEffective) {
          notify(watcher.user.toString(), {
            type: "account",
            title: "Price drop alert!",
            message: `${updatedProduct.name} dropped by ${savings}% to ₦${newEffective.toLocaleString("en-NG")}`,
            link: `/products/${updatedProduct._id}`,
          }).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    logger.error("❌ Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// ✅ Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // only seller can delete
    if (product.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Soft-delete: keep the document (and its images) so active orders still
    // reference their product. The pre-find middleware hides it from all normal
    // queries automatically.
    product.deletedAt = new Date();
    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    logger.error("❌ Error deleting product:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete product" });
  }
};

// ✅ Add review to product
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      comment,
    });

    product.reviews.push(review._id);
    await product.save();

    res.status(201).json({ success: true, message: "Review added", review });
  } catch (error) {
    logger.error("❌ Error adding review:", error);
    res.status(500).json({ success: false, message: "Failed to add review" });
  }
};

// NOTE: Variant APIs removed to avoid SKU unique-index conflicts.

export const getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id }, // exclude current product
    })
      .limit(8)
      .select("_id name price images image");

    res.json(related);
  } catch (err) {
    logger.error("❌ Error fetching related products:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAdvertisedProducts = async (req, res) => {
  try {
    // Adjust this to your schema — maybe you use "isAdvertised" or "featured"
    const advertisedProducts = await Product.find({ isAdvertised: true }).limit(
      10
    );
    res.json(advertisedProducts);
  } catch (error) {
    logger.error("Error fetching advertised products:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching advertised products" });
  }
};

export const filterAndSortProducts = async (req, res) => {
  try {
    const { categories, conditions, prices, sort } = req.query;
    const query = {};

    // ---------------------------
    // 🔍 CATEGORY FILTER
    // ---------------------------
    if (categories) {
      const catArray = categories.split(",").map((c) => new RegExp(c, "i"));
      query.category = { $in: catArray };
    }

    // ---------------------------
    // ⚙️ CONDITION FILTER
    // ---------------------------
    if (conditions) {
      const condArray = conditions.split(",").map((c) => new RegExp(c, "i"));
      query.condition = { $in: condArray };
    }

    // ---------------------------
    // 💰 PRICE FILTER
    // ---------------------------
    if (prices) {
      const priceRanges = prices.split(",");
      const orConditions = [];

      priceRanges.forEach((r) => {
        if (r === "under-50") orConditions.push({ price: { $lt: 50 } });
        if (r === "50-100")
          orConditions.push({ price: { $gte: 50, $lte: 100 } });
        if (r === "100-200")
          orConditions.push({ price: { $gte: 100, $lte: 200 } });
        if (r === "above-200") orConditions.push({ price: { $gt: 200 } });
      });

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    // ---------------------------
    // 🧮 SORT LOGIC
    // ---------------------------
    let sortQuery = {};
    if (sort === "price-low") sortQuery = { price: 1 };
    else if (sort === "price-high") sortQuery = { price: -1 };
    else if (sort === "newest") sortQuery = { createdAt: -1 };
    else if (sort === "oldest") sortQuery = { createdAt: 1 };

    // ---------------------------
    // 📦 GET PRODUCTS
    // ---------------------------
    const products = await Product.find(query)
      .populate("seller", "name email storeName")
      .populate("category", "name")
      .sort(sortQuery);

    res.status(200).json(products);
  } catch (error) {
    logger.error("Error filtering/sorting products:", error);
    res.status(500).json({ message: "Error filtering/sorting products" });
  }
};

// POST /products/:id/view
export const trackProductView = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const userId = req.user?._id?.toString();
    const sellerId = product.seller?.toString();

    // Seller viewing own product should not increment
    if (userId && userId === sellerId)
      return res
        .status(200)
        .json({ message: "Self view ignored", views: product.views || 0 });

    let incremented = false;

    if (userId) {
      // Only increment if user hasn't viewed before
      product.viewedBy = product.viewedBy || [];
      if (!product.viewedBy.includes(userId)) {
        product.views = (product.views || 0) + 1;
        product.viewedBy.push(userId);
        incremented = true;
      }
    } else {
      // Anonymous visitor: always increment
      product.views = (product.views || 0) + 1;
      incremented = true;
    }

    if (incremented) await product.save();

    res.status(200).json({ success: true, views: product.views });
  } catch (err) {
    logger.error("❌ Error tracking view:", err);
    res.status(500).json({ message: "Server error tracking view" });
  }
};

// POST /api/products/:id/notify-restock  — toggle restock alert subscription
export const toggleRestockAlert = async (req, res) => {
  try {
    const userId = req.user._id;
    const product = await Product.findById(req.params.id).select("restockSubscribers stock name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    if ((product.stock || 0) > 0) return res.status(400).json({ message: "Product is currently in stock" });

    const idx = product.restockSubscribers.findIndex((id) => id.toString() === userId.toString());
    if (idx >= 0) {
      product.restockSubscribers.splice(idx, 1);
      await product.save();
      return res.json({ subscribed: false });
    }
    product.restockSubscribers.push(userId);
    await product.save();
    res.json({ subscribed: true });
  } catch (err) {
    logger.error("toggleRestockAlert:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/products/:id/watch-price  — toggle price-drop alert
export const togglePriceWatch = async (req, res) => {
  try {
    const userId = req.user._id;
    const product = await Product.findById(req.params.id).select("priceWatchers price name");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const idx = product.priceWatchers.findIndex((w) => w.user.toString() === userId.toString());
    if (idx >= 0) {
      product.priceWatchers.splice(idx, 1);
      await product.save();
      return res.json({ watching: false });
    }
    product.priceWatchers.push({ user: userId, priceAtSubscription: product.salePrice ?? product.price });
    await product.save();
    res.json({ watching: true, currentPrice: product.salePrice ?? product.price });
  } catch (err) {
    logger.error("togglePriceWatch:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/products/following  — products from sellers the logged-in user follows
export const getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    // User.following holds Seller ObjectIds
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId).select("following").lean();
    if (!user?.following?.length) return res.json({ products: [] });

    // Resolve seller._id → seller.user so we can filter products by seller (user)
    const sellers = await Seller.find({ _id: { $in: user.following } }).select("user").lean();
    const sellerUserIds = sellers.map((s) => s.user);
    if (!sellerUserIds.length) return res.json({ products: [] });

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const products = await Product.find({ seller: { $in: sellerUserIds }, isAvailable: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("seller", "name avatar")
      .lean();

    res.json({ products });
  } catch (err) {
    logger.error("getFollowingFeed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

