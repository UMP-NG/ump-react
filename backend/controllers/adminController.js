import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Product from "../models/Product.js";
import Listing from "../models/Listing.js";
import Service from "../models/Service.js";
import Order from "../models/Order.js";
import PushSub from "../models/PushSub.js";
import fs from "fs";
import csv from "csv-parser";
import logger from "../utils/logger.js";

// Note: this file used to also export adminLogin, getAllUsers, getAllSellers,
// getAllProducts, getAllListings, getAllServices, and getAllOrders — none of
// them were imported by any route (superseded by the domain-specific
// controllers under adminUserController.js / adminSellerController.js / etc.,
// mounted in adminRoutes.js). Removed as dead code.

const ASSIGNABLE_ROLES = ["user", "seller", "service_provider"];

export const updateUserRole = async (req, res) => {
  try {
    const { role, roles } = req.body;

    // Block any attempt to grant admin via API — validate BOTH fields to prevent dual-field bypass
    const requested = [
      ...(role ? [role] : []),
      ...(Array.isArray(roles) ? roles : []),
    ];
    if (requested.some((r) => !ASSIGNABLE_ROLES.includes(r))) {
      return res.status(403).json({
        message: "Cannot assign that role via API. Privileged roles must be set directly in the database.",
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (Array.isArray(roles)) {
      // Preserve any existing privileged roles (e.g. "admin") already in the DB — only update the safe ones
      const privileged = (user.roles || []).filter((r) => !ASSIGNABLE_ROLES.includes(r));
      user.roles = [...new Set([...privileged, ...roles])];
    } else if (role) {
      // Single role provided — merge it in, preserving privileged roles
      const privileged = (user.roles || []).filter((r) => !ASSIGNABLE_ROLES.includes(r));
      user.roles = [...new Set([...privileged, role])];
    }

    await user.save();
    // Keep PushSub.roles in sync so audience filters in broadcasts stay accurate
    await PushSub.updateMany({ user: user._id }, { $set: { roles: user.roles } });
    res.json({ success: true, user: { _id: user._id, roles: user.roles } });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// SELLERS MANAGEMENT
// ===============================
export const updateSellerStatus = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.status = req.body.status || seller.status; // active, banned, etc.
    await seller.save();
    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    const now = new Date();
    await Promise.allSettled([
      // Soft-delete all products and services belonging to this seller
      Product.updateMany({ seller: seller.user }, { $set: { deletedAt: now } }),
      Service.updateMany({ provider: seller.user }, { $set: { deletedAt: now } }),
      // Remove seller role from the linked user account
      seller.user && User.findByIdAndUpdate(seller.user, { $pull: { roles: { $in: ["seller", "service_provider"] } } }),
      seller.user && PushSub.updateMany({ user: seller.user }, { $pull: { roles: { $in: ["seller", "service_provider"] } } }),
    ]);

    await seller.deleteOne();
    res.json({ message: "Store deleted — products, services, and seller/provider roles removed." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// PRODUCTS MANAGEMENT
// ===============================
// Moderation-only fields — full product edits go through the seller's own
// PUT /api/products/:id (productController.updateProduct), which already
// whitelists fields correctly. This admin endpoint only ever needs to
// flag/remove/promote a listing, never touch ownership, price, or stock.
const ADMIN_PRODUCT_FIELDS = ["isFlagged", "isRemoved", "isAdvertised"];

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    for (const key of ADMIN_PRODUCT_FIELDS) {
      if (req.body[key] !== undefined) product[key] = req.body[key];
    }
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).setOptions({ includeDeleted: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.deletedAt = new Date();
    await product.save();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// LISTINGS MANAGEMENT
// ===============================
// Moderation-only — ownership ("owner") and pricing/fee fields must never be
// settable from the admin panel's raw update; full edits belong to the owner
// via PUT /api/listings/:id.
const ADMIN_LISTING_FIELDS = ["available", "furnished"];

export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    for (const key of ADMIN_LISTING_FIELDS) {
      if (req.body[key] !== undefined) listing[key] = req.body[key];
    }
    await listing.save();
    res.json(listing);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.listingId).setOptions({ includeDeleted: true });
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    listing.deletedAt = new Date();
    await listing.save();
    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// SERVICES MANAGEMENT
// ===============================
// "verified" is legitimately admin-settable here — this IS the verification-
// approval workflow. Ownership ("provider") and rating fields are not.
const ADMIN_SERVICE_FIELDS = ["available", "verified"];

export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    for (const key of ADMIN_SERVICE_FIELDS) {
      if (req.body[key] !== undefined) service[key] = req.body[key];
    }
    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId).setOptions({ includeDeleted: true });
    if (!service) return res.status(404).json({ message: "Service not found" });

    service.deletedAt = new Date();
    await service.save();
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// ORDERS MANAGEMENT
// ===============================
// Never expose buyer/seller/items/totalAmount/paymentStatus/paymentInfo/
// deliveryCode/deliveryCodeUsed/escrowReleasedAt/refund here — those are only
// safe to change through the guarded state machine in
// orderController.updateOrderStatus / confirmDelivery.
const ADMIN_ORDER_STATUSES = ["processing", "shipped", "delivered", "completed", "cancelled"];

export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.body.status !== undefined) {
      if (!ADMIN_ORDER_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      order.status = req.body.status;
    }
    if (req.body.trackingNumber !== undefined) order.trackingNumber = req.body.trackingNumber;
    if (req.body.notes !== undefined) order.notes = req.body.notes;
    if (req.body.disputeNote !== undefined) order.disputeNote = req.body.disputeNote;

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const bulkImportProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        try {
          const inserted = await Product.insertMany(results);
          // Clean up temporary file from disk
          fs.unlink(req.file.path, (err) => {
            if (err) logger.warn("⚠️ Could not delete temp file:", err);
          });
          res.status(201).json({
            message: `✅ ${inserted.length} products imported successfully.`,
            data: inserted,
          });
        } catch (insertErr) {
          // Clean up file on error
          fs.unlink(req.file.path, (err) => {
            if (err) logger.warn("⚠️ Could not delete temp file:", err);
          });
          throw insertErr;
        }
      });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: "Import failed", error: err.message });
  }
};

