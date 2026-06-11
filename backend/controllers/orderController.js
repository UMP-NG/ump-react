import mongoose from "mongoose";
import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import Negotiation from "../models/Negotiation.js";
import Config from "../models/Config.js";
import PDFDocument from "pdfkit";
import cloudinary from "../config/cloudinary.js";
import { audit } from "../utils/auditLog.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";

// Read platform fee settings from Config once per request (cached in local var)
async function getFeeConfig() {
  const config = await Config.findOne().select("fees").lean();
  const f = config?.fees || {};
  return {
    serviceChargeEnabled: f.serviceChargeEnabled ?? true,
    serviceFeeRate:       (f.serviceFee           ?? 5.0) / 100,
    serviceChargeMin:     f.serviceChargeMin       ?? 100,
    serviceChargeMax:     f.serviceChargeMax       ?? 2000,
    platformFeeEnabled:   f.platformFeeEnabled     ?? false,
    platformFeeRate:      (f.platformFee           ?? 5.0) / 100,
  };
}

function calcServiceCharge(items, cfg) {
  if (!cfg.serviceChargeEnabled) return 0;
  return items.reduce((total, i) => {
    const itemTotal = (i.price || 0) * (i.quantity || 1);
    return total + Math.min(cfg.serviceChargeMax, Math.round(itemTotal * cfg.serviceFeeRate));
  }, 0);
}

// Fix #6: use cryptographically secure random bytes instead of Math.random()
function generateDeliveryCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // 3 bytes = 6 hex chars
}

// ===============================
// Create a new order
// ===============================
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, notes } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Order must contain at least one item" });
    }

    let subtotal = 0;
    let deliveryFee = 0;

    // Process each item
    const processedItems = [];
    for (const item of items) {
      // Fix #12: validate quantity before using it in calculations
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ message: `Invalid quantity for item ${item.product}. Must be a positive integer.` });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      subtotal    += product.price * qty;
      deliveryFee += Math.max(0, product.deliveryFee || 0);

      processedItems.push({
        product: product._id,
        quantity: qty,
        price: product.price,
        variant: item.variant || {},
      });
    }

    const tax = 0;
    const totalAmount = subtotal + tax + deliveryFee;

    const order = await Order.create({
      buyer: req.user._id,
      items: processedItems,
      subtotal,
      tax,
      deliveryFee,
      totalAmount,
      shippingAddress,
      notes,
      status: "pending",
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    logger.error("Error creating order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Allowed payment methods
const PAYMENT_METHODS = [
  "Paystack",
  "Flutterwave",
  "Stripe",
  "PayPal",
  "COD",
  "transfer",
];

export const checkoutCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const feeConfig = await getFeeConfig();

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let { paymentMethod, shippingAddress, deliverySelections, creditToUse } = req.body;
    // deliverySelections: { [sellerId]: { method: "pickup"|"self"|"shipbubble", fee: number } }
    deliverySelections = deliverySelections || {};
    const VALID_METHODS = ["pickup", "self", "shipbubble"];
    paymentMethod = paymentMethod?.toLowerCase().trim();

    const PAYMENT_MAP = {
      paystack: "Paystack",
      flutterwave: "Flutterwave",
      stripe: "Stripe",
      paypal: "PayPal",
      cod: "COD",
      transfer: "transfer",
    };
    paymentMethod = PAYMENT_MAP[paymentMethod] || "Paystack";

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: `Invalid payment method: ${paymentMethod}` });
    }

    // Group cart items by seller — creates one order per seller
    const sellerGroups = new Map();
    for (const item of cart.items) {
      const product = item.product;
      if (!product?._id) continue;
      const sid = product.seller?.toString();
      if (!sid) continue;
      if (sid === userId.toString()) continue; // skip own products (guard at addToCart too)
      if (!sellerGroups.has(sid)) sellerGroups.set(sid, []);
      sellerGroups.get(sid).push(item);
    }

    if (sellerGroups.size === 0)
      return res.status(400).json({ message: "No valid items to order" });

    // ── Referral credit deduction ─────────────────────────────────────────────
    const buyer      = await User.findById(userId).select("referralCredit").lean();
    const available  = buyer?.referralCredit || 0;
    // Use negotiatedPrice if set (server-stored when negotiation was accepted), else canonical product price
    const cartTotal  = [...sellerGroups.values()].flat().reduce(
      (s, i) => s + (i.negotiatedPrice ?? i.product.price) * (i.quantity || 1), 0
    );
    const creditApplied = Math.min(Math.max(0, Number(creditToUse) || 0), available, cartTotal);
    let creditRemaining = creditApplied;

    if (creditApplied > 0) {
      // Atomic deduction with $gte guard — prevents double-spend in concurrent requests
      const updated = await User.findOneAndUpdate(
        { _id: userId, referralCredit: { $gte: creditApplied } },
        { $inc: { referralCredit: -creditApplied } },
        { new: false }
      );
      if (!updated) {
        return res.status(400).json({ message: "Insufficient referral credit — it may have been used in another request." });
      }
    }

    const createdOrders = [];
    let isFirstOrder = true;
    for (const [sid, sellerItems] of sellerGroups) {
      const orderItems = sellerItems.map((i) => ({
        product:         i.product._id,
        quantity:        i.quantity,
        // Use server-stored negotiatedPrice if present (set when buyer's negotiation was accepted)
        price:           i.negotiatedPrice ?? i.product.price,
        negotiatedPrice: i.negotiatedPrice || undefined,
        negotiationId:   i.negotiationId   || undefined,
        variant:         i.variant || {},
      }));

      const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const serviceCharge = calcServiceCharge(orderItems, feeConfig);
      // Distribute credit proportionally; last order gets the remainder
      const isLastOrder = createdOrders.length === sellerGroups.size - 1;
      const orderCredit = isLastOrder
        ? creditRemaining
        : Math.min(Math.round((subtotal / cartTotal) * creditApplied), creditRemaining);
      creditRemaining -= orderCredit;

      const sel = deliverySelections[sid] || {};
      const orderDeliveryMethod = VALID_METHODS.includes(sel.method) ? sel.method : "pickup";
      const orderDeliveryFee    = Math.max(0, Number(sel.fee) || 0);

      const order = new Order({
        buyer: userId,
        seller: new mongoose.Types.ObjectId(sid),
        items: orderItems,
        subtotal,
        serviceCharge,
        deliveryFee: orderDeliveryMethod === "pickup" ? 0 : orderDeliveryFee,
        totalAmount: Math.max(0, subtotal + serviceCharge + (orderDeliveryMethod === "pickup" ? 0 : orderDeliveryFee) - orderCredit),
        creditUsed: orderCredit,
        shippingAddress: shippingAddress || {},
        paymentMethod,
        deliveryMethod: orderDeliveryMethod,
        status: "pending",
        deliveryCode: generateDeliveryCode(),
      });
      await order.save();
      createdOrders.push(order);
      isFirstOrder = false;
    }

    // Cart is cleared in confirmAllOrders after payment is confirmed —
    // not here, so abandoned payments don't leave users with an empty cart.

    const orderWord = createdOrders.length > 1 ? `${createdOrders.length} orders` : `order #${createdOrders[0]._id.toString().slice(-6).toUpperCase()}`;
    notify(userId, {
      type: "order",
      title: "Almost there!",
      message: `${orderWord.charAt(0).toUpperCase() + orderWord.slice(1)} created. Complete your payment to confirm.`,
      link: "/orders",
    });

    return res.status(201).json({ success: true, orders: createdOrders, order: createdOrders[0] });
  } catch (err) {
    logger.error("❌ Checkout error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// BUYER: Get my orders
// ======================================================
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 })
      .lean();

    // Attach store names so the buyer knows which delivery code belongs to which store
    const sellerIds = [...new Set(orders.map((o) => o.seller?.toString()).filter(Boolean))];
    if (sellerIds.length) {
      const profiles = await Seller.find({ user: { $in: sellerIds } })
        .select("user storeName")
        .lean();
      const nameMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p.storeName || ""]));
      orders.forEach((o) => { if (o.seller) o.storeName = nameMap[o.seller.toString()] || ""; });
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    logger.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================================================
// SELLER: Get all orders containing their products
// Supports: ?status=&search=&sort=&limit=
// ======================================================
export const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    // find product ids for seller
    const products = await Product.find({ seller: userId })
      .select("_id")
      .lean();
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0)
      return res.json({ orders: [], message: "No products found for seller" });

    // Only show paid/released orders to sellers — exclude payment-abandoned orders
    const filter = {
      "items.product": { $in: productIds },
      paymentStatus: { $in: ["paid", "released"] },
    };

    // filter by status — allowlist prevents NoSQL operator injection via query string
    const VALID_ORDER_STATUSES = ["pending", "pending-verification", "confirmed", "shipped", "completed", "cancelled", "disputed", "partial"];
    if (req.query.status) {
      if (!VALID_ORDER_STATUSES.includes(req.query.status))
        return res.status(400).json({ message: "Invalid status filter" });
      filter.status = req.query.status;
    }

    // search by order ID
    if (req.query.search) {
      const q = req.query.search;
      if (/^[0-9a-fA-F]{24}$/.test(q)) filter._id = q;
    }

    // base query
    let query = Order.find(filter)
      .populate("buyer", "name email")
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 });

    // sorting
    if (req.query.sort === "value-asc") query = query.sort({ totalAmount: 1 });
    if (req.query.sort === "value-desc")
      query = query.sort({ totalAmount: -1 });

    const orders = await query.limit(parseInt(req.query.limit || 50)).lean();

    res.json({ orders });
  } catch (err) {
    logger.error("getSellerOrders error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ======================================================
// UNIVERSAL: Get single order by ID (buyer or seller)
// ======================================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "name email")
      .populate("items.product", "name price images seller")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    const userId = req.user._id.toString();

    // check if buyer or seller has access
    const isBuyer = order.buyer._id.toString() === userId;
    const isSeller = order.items.some(
      (i) => i.product?.seller?.toString() === userId
    );

    if (!isBuyer && !isSeller)
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });

    res.json({ success: true, order });
  } catch (err) {
    logger.error("getOrderById error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ======================================================
// SELLER: Update whole-order status
// Flow: pending → confirmed → shipped → completed
//        any active state → cancelled (triggers refund if paid)
// On completed: escrow released to seller wallet
// ======================================================
export const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ["confirmed", "shipped", "completed", "cancelled"];
    if (!VALID.includes(status))
      return res.status(400).json({ message: "Invalid status. Must be one of: confirmed, shipped, completed, cancelled" });

    const order = await Order.findById(id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify this seller owns at least one item in the order
    const isAdmin = req.user.roles?.includes("admin");
    const isOrderSeller =
      order.seller?.toString() === userId ||
      order.items.some((i) => i.product?.seller?.toString() === userId);

    if (!isOrderSeller && !isAdmin)
      return res.status(403).json({ message: "Not authorized to update this order" });

    // Prevent changes to already-finalised orders
    if (["completed", "cancelled"].includes(order.status))
      return res.status(400).json({ message: `Order is already ${order.status}` });

    // Partial delivery in progress — only confirmDelivery can advance the order
    if (order.status === "partial" && status !== "cancelled")
      return res.status(400).json({ message: "Partial delivery in progress — use the delivery code to confirm remaining items" });

    // Non-pickup orders must be completed via the buyer's delivery code
    if (status === "completed" && order.deliveryMethod !== "pickup" && !order.deliveryCodeUsed)
      return res.status(400).json({ message: "Delivery orders must be completed by the buyer confirming the delivery code — use the 'Confirm delivery' flow instead." });

    // Fix #11: prevent double-crediting if escrow was already released
    if (status === "completed" && order.escrowReleasedAt)
      return res.status(400).json({ message: "Escrow has already been released for this order." });

    // Enforce forward-only transitions (cancellation is always allowed)
    const FLOW = { "pending": 0, "pending-verification": 0, "confirmed": 1, "shipped": 2, "completed": 3 };
    if (status !== "cancelled" && FLOW[status] <= FLOW[order.status])
      return res.status(400).json({ message: `Cannot move from "${order.status}" to "${status}"` });

    const previousStatus = order.status;

    // Only admins may confirm a transfer order — authorization check before any state mutation
    if (status === "confirmed" && previousStatus === "pending-verification" && !isAdmin) {
      return res.status(403).json({ message: "Only admins can verify transfer payments" });
    }

    order.status = status;

    // When admin confirms a transfer order, mark payment as received
    if (status === "confirmed" && previousStatus === "pending-verification") {
      order.paymentStatus = "paid";
      order.paymentInfo = { ...order.paymentInfo, paidAt: new Date() };
    }

    // ── On COMPLETED: release escrow to seller ───────────────────────────────
    if (status === "completed") {
      order.paymentStatus = "released";
      order.escrowReleasedAt = new Date();

      const sellerId = order.seller || order.items[0]?.product?.seller;
      if (sellerId) {
        const cfg = await getFeeConfig();
        const sellerBase = order.subtotal || order.totalAmount;
        const sellerPayout = cfg.platformFeeEnabled
          ? Math.floor(sellerBase * (1 - cfg.platformFeeRate))
          : sellerBase;
        await Seller.findOneAndUpdate(
          { user: sellerId },
          {
            $inc: {
              pendingPayout: sellerPayout,
              totalRevenue: sellerBase,
              totalOrders: 1,
            },
          }
        );
      }

      // Reduce stock and log sold units
      for (const item of order.items) {
        const productId = item.product?._id || item.product;
        if (productId) {
          await Product.findByIdAndUpdate(productId, {
            $inc: {
              stock: -Math.abs(item.quantity),
              sold: item.quantity,
              purchases: item.quantity,
            },
          });
        }
      }
    }

    // ── On CANCELLED: initiate refund if payment was received ────────────────
    if (status === "cancelled" && order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      order.refund = {
        amount: order.totalAmount,
        reason: "Order cancelled by seller",
        status: "requested",
        initiatedAt: new Date(),
      };
    }

    await order.save();

    // Notify buyer of status change
    const STATUS_MSG = {
      confirmed:  "Your order has been confirmed by the seller.",
      shipped:    "Your order is on its way!",
      completed:  "Your order has been marked as completed.",
      cancelled:  "Your order has been cancelled.",
    };
    if (order.buyer) {
      notify(order.buyer, {
        type: "order",
        title: `Order ${status}`,
        message: STATUS_MSG[status] || `Your order status changed to ${status}.`,
        link: "/orders",
      });
    }

    audit(`ORDER_${status.toUpperCase()}`, {
      actor: req.user._id,
      entity: "Order",
      entityId: order._id,
      amount: order.totalAmount,
      meta: { previousStatus, newStatus: status },
      req,
    });

    res.json({
      success: true,
      message: `Order marked as ${status}`,
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refund: order.refund,
        escrowReleasedAt: order.escrowReleasedAt,
      },
    });
  } catch (err) {
    logger.error("updateOrderStatus error:", err);
    res.status(500).json({ message: "Server error" }); // fix #16: don't leak err.message
  }
};

// ===============================
// Update order (admin/seller only)
// ===============================
export const updateOrder = async (req, res) => {
  try {
    const { status, paymentStatus, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only the order's seller (or an item-level seller, or an admin) may update
    const isAdmin = req.user.roles?.includes("admin");
    const userId  = req.user._id.toString();
    if (!isAdmin) {
      const directMatch = order.seller?.toString() === userId;
      const itemMatch   = order.items.some((i) => i.product?.seller?.toString() === userId);
      if (!directMatch && !itemMatch) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }
    }

    if (status) order.status = status;
    // Fix #1: only admins may change paymentStatus — sellers cannot
    if (paymentStatus && isAdmin) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    logger.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Check if current user purchased a product
// ===============================
export const hasPurchased = async (req, res) => {
  try {
    const { productId } = req.params;
    // Fix #18: include "partial" — buyer has received some items and can review them
    const order = await Order.findOne({
      buyer: req.user._id,
      "items.product": productId,
      status: { $in: ["confirmed", "shipped", "partial", "completed"] },
    }).select("_id");
    res.json({ purchased: !!order });
  } catch (err) {
    logger.error("hasPurchased:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Raise a dispute (buyer only)
// ===============================
export const raiseDispute = async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Dispute reason is required" });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.buyer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You can only dispute your own orders" });
    if (order.status === "disputed")
      return res.status(400).json({ message: "A dispute is already open for this order" });
    if (["cancelled", "completed"].includes(order.status))
      return res.status(400).json({ message: "Cannot dispute a completed or cancelled order" });

    order.status             = "disputed";
    order.disputeReason      = reason.trim();
    order.disputeDescription = (description || "").trim();
    await order.save({ validateModifiedOnly: true });

    // Notify seller of dispute
    const sellerUserId = order.seller;
    if (sellerUserId) {
      notify(sellerUserId, {
        type: "dispute",
        title: "Dispute raised",
        message: `A buyer has raised a dispute on order #${order._id.toString().slice(-6).toUpperCase()}. Check your orders for details.`,
        link: "/seller-dashboard",
      });
    }

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    logger.error("raiseDispute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Delete order (buyer/admin)
// ===============================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Fix #3: only the buyer or an admin may cancel an order
    const isAdmin = req.user.roles?.includes("admin");
    if (!isAdmin && order.buyer?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    // Prevent direct deletion of paid orders
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid orders require refund process" });
    }

    order.status = "cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Order canceled successfully",
      order,
    });
  } catch (error) {
    logger.error("Error canceling order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧾 Generate Invoice PDF
export const downloadInvoice = async (req, res) => {
  try {
    // Fix #8a: route uses /:id not /:orderId — was always undefined causing 404
    const { id } = req.params;
    const order = await Order.findById(id).populate("buyer", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Fix #8b: verify the requester is the buyer, the seller, or an admin
    const isAdmin  = req.user.roles?.includes("admin");
    const isBuyer  = order.buyer?._id?.toString() === req.user._id.toString();
    const isSeller = order.seller?.toString()      === req.user._id.toString();
    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({ message: "Not authorized to download this invoice" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${order._id}.pdf"`);
    await generateInvoicePDF(order, res);
  } catch (error) {
    logger.error("downloadInvoice error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Failed to generate invoice" });
  }
};

// markOrderAsPaid removed — was never mounted in any route (dead export)
export const getIncomingOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const products = await Product.find({ seller: userId }).select("_id");
    const productIds = products.map((p) => p._id);

    if (!productIds.length)
      return res.json({
        success: true,
        orders: [],
        message: "No incoming orders",
      });

    const orders = await Order.find({
      "items.product": { $in: productIds },
      status: { $ne: "cancelled" },
    })
      .populate("buyer", "name email")
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    logger.error("getIncomingOrders error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Streams the PDF directly to the response — no disk writes, no leftover files.
export const generateInvoicePDF = (order, res) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    doc.pipe(res);
    doc.on("error", reject);
    res.on("error", reject);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Buyer: ${order.buyer?.name || "Unknown"}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    doc.text("Items:", { underline: true });
    order.items.forEach((item) => {
      doc.text(`${item.product?.name || "Product"} - Qty: ${item.quantity} - ₦${item.price}`);
    });

    doc.moveDown();
    doc.text(`Total: ₦${order.totalAmount}`, { bold: true });
    doc.on("end", resolve);
    doc.end();
  });

// PUT /api/orders/:orderId/confirm-delivery
// Called by SELLER — submits the buyer's delivery code.
// deliveredItemIds (optional): subdocument item _ids being delivered this round.
//   Omit (or pass all pending items) = full delivery (current behaviour).
//   Pass a subset = partial delivery; remaining items get a fresh code.
export const confirmDelivery = async (req, res) => {
  try {
    const { deliveryCode, deliveredItemIds } = req.body;
    if (!deliveryCode)
      return res.status(400).json({ message: "Delivery code is required" });

    const code = deliveryCode.trim().toUpperCase();

    // Load order for pre-validation (read-only at this stage)
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid")
      return res.status(400).json({ message: "Payment not yet confirmed for this order" });

    if (order.deliveryCodeUsed)
      return res.status(400).json({ message: "Delivery already confirmed for this order" });

    // Constant-time delivery code comparison — prevents timing-based enumeration
    const storedBuf = Buffer.from(order.deliveryCode || "");
    const inputBuf  = Buffer.from(code);
    const codeMatch = storedBuf.length === inputBuf.length && crypto.timingSafeEqual(storedBuf, inputBuf);
    if (!codeMatch)
      return res.status(400).json({ message: "Invalid delivery code" });

    // Verify seller ownership before the atomic gate
    const userId = req.user._id.toString();
    const isAdmin = req.user.roles?.includes("admin");
    if (!isAdmin) {
      const sellerUserId = order.seller?.toString();
      // Check either direct seller match or product ownership
      if (!sellerUserId || sellerUserId !== userId) {
        const products = await Product.find({ seller: req.user._id }).select("_id").lean();
        const productIds = products.map((p) => p._id.toString());
        const ownsItem = order.items.some((i) => productIds.includes((i.product?._id || i.product).toString()));
        if (!ownsItem) return res.status(403).json({ message: "Not authorized" });
      }
    }

    // ── Atomic gate: exactly one concurrent request wins ─────────────────────
    // findOneAndUpdate with deliveryCodeUsed:false ensures this is a test-and-set.
    // Any second concurrent request that passed the checks above will fail here.
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, deliveryCodeUsed: false, paymentStatus: "paid" },
      { $set: { deliveryCodeUsed: true } },
      { new: false }
    );
    if (!claimed)
      return res.status(400).json({ message: "Delivery already confirmed by a concurrent request — please check order status." });

    // Look up seller profile — used for payout crediting only; delivery never fails if absent
    const sellerUserId = order.seller || req.user._id;
    const seller = await Seller.findOne({ user: sellerUserId });

    // Determine which pending items are being delivered now
    const pendingItems = order.items.filter((i) => i.status !== "completed");
    const toDeliver = deliveredItemIds?.length
      ? pendingItems.filter((i) => deliveredItemIds.includes(i._id.toString()))
      : pendingItems;

    if (toDeliver.length === 0)
      return res.status(400).json({ message: "No items selected for delivery" });

    const isPartial = toDeliver.length < pendingItems.length;

    // Pro-rate seller payout for this delivery batch, using item prices as base
    // (service charge goes to platform — seller is never penalised for it)
    const cfg = await getFeeConfig();
    const allItemsSubtotal   = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveredSubtotal  = toDeliver.reduce((s, i) => s + i.price * i.quantity, 0);
    const proportion         = allItemsSubtotal > 0 ? deliveredSubtotal / allItemsSubtotal : 1;
    const sellerBase         = (order.subtotal || allItemsSubtotal) * proportion;
    const payoutAmount       = cfg.platformFeeEnabled
      ? Math.floor(sellerBase * (1 - cfg.platformFeeRate))
      : Math.floor(sellerBase);
    const payoutRef = `ESCROW_${order._id}_${Date.now()}`;

    // Mark delivered items
    for (const item of toDeliver) {
      item.status = "completed";
    }

    if (isPartial) {
      // Generate a fresh code for the remaining items
      const newCode = generateDeliveryCode();
      order.deliveryCode = newCode;
      order.deliveryCodeUsed = false;
      order.status = "partial";
    } else {
      order.deliveryCodeUsed = true;
      order.status = "completed";
      order.paymentStatus = "released";
      order.escrowReleasedAt = new Date();
    }

    await order.save();

    // Credit seller's pending balance — delivery confirmation must never fail because
    // the seller hasn't set up bank details or their Seller document is missing.
    if (seller) {
      await Seller.findByIdAndUpdate(seller._id, {
        $inc: {
          pendingPayout: payoutAmount,
          totalRevenue: deliveredSubtotal,
          ...(isPartial ? {} : { totalOrders: 1 }),
        },
        $push: {
          payoutHistory: {
            amount: payoutAmount,
            status: "pending",
            referenceId: payoutRef,
          },
        },
      });
    } else {
      // Seller profile doesn't exist yet — log for admin follow-up but don't block delivery
      logger.warn(`confirmDelivery: no Seller document for user ${sellerUserId}; order ${order._id} payout of ₦${payoutAmount} needs manual admin credit`);
    }

    // Reduce stock for delivered items only
    for (const item of toDeliver) {
      const productId = item.product?._id || item.product;
      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: -Math.abs(item.quantity), sold: item.quantity, purchases: item.quantity },
        });
      }
    }

    // Notify buyer
    if (isPartial) {
      const remaining = pendingItems.length - toDeliver.length;
      notify(order.buyer, {
        type: "order",
        title: "Partial delivery confirmed",
        message: `${toDeliver.length} of ${order.items.length} items delivered. New delivery code for the remaining ${remaining} item${remaining > 1 ? "s" : ""}: ${order.deliveryCode}`,
        link: "/orders",
      });
    } else {
      notify(order.buyer, {
        type: "order",
        title: "Order delivered!",
        message: `All items in order #${order._id.toString().slice(-6).toUpperCase()} have been delivered.`,
        link: "/orders",
      });
    }

    res.json({
      success: true,
      partial: isPartial,
      deliveredCount: toDeliver.length,
      remainingCount: pendingItems.length - toDeliver.length,
      message: isPartial
        ? `${toDeliver.length} item${toDeliver.length > 1 ? "s" : ""} confirmed. New code sent to buyer for remaining ${pendingItems.length - toDeliver.length} item${pendingItems.length - toDeliver.length > 1 ? "s" : ""}.`
        : "Delivery confirmed. Payout credited to seller balance.",
    });
  } catch (err) {
    logger.error("confirmDelivery error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.message || "Failed to confirm delivery" });
  }
};

export const getCurrentOrder = async (req, res) => {
  try {
    let order = await Order.findOne({
      buyer: req.user._id,
      paymentStatus: "pending", // only pending orders
    });

    // Auto-create if not found
    if (!order) {
      order = await Order.create({
        buyer: req.user._id,
        items: [],
        totalAmount: 0, // required
        subtotal: 0,
        tax: 0,
        paymentStatus: "pending",
        paymentMethod: "Paystack", // default
      });
    }

    res.status(200).json(order);
  } catch (err) {
    logger.error("💥 getCurrentOrder error:", err);
    res.status(500).json({ message: "Failed to fetch current order" });
  }
};

// Dispatch booking moved to POST /api/delivery/book/:orderId (deliveryController.js)
// This stub is kept so existing route files don't break during migration.
export const bookDispatch = async (_req, res) =>
  res.status(410).json({ message: "Use POST /api/delivery/book/:orderId instead" });

export const confirmTransfer = async (req, res) => {
  try {
    const { orderInfo } = req.body;
    if (!orderInfo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing order details" });
    }
    const feeConfig = await getFeeConfig();

    // Parse order data from FormData
    const info = JSON.parse(orderInfo);
    const { fullName, email, location, phone, notes, items, shippingAddress } =
      info;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Handle file upload to Cloudinary
    let paymentProofPath = null;
    if (req.file) {
      paymentProofPath = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    // Group items by seller
    const itemsBySeller = items.reduce((acc, item) => {
      if (!item.seller) return acc;
      if (!acc[item.seller]) acc[item.seller] = [];
      acc[item.seller].push(item);
      return acc;
    }, {});

    const createdOrders = [];

    // Create an order per seller
    for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
      // Always fetch authoritative price + deliveryFee from DB — never trust client-submitted prices
      const productIds = [...new Set(sellerItems.map(i => i.product).filter(Boolean).map(String))];
      const productDocs = await Product.find({ _id: { $in: productIds } }).select("_id price deliveryFee").lean();
      const priceMap = new Map(productDocs.map(p => [p._id.toString(), { price: p.price, fee: p.deliveryFee || 0 }]));

      // Resolve per-item price: verify negotiation from DB when present, fall back to canonical price
      const resolvedItems = await Promise.all(sellerItems.map(async (item) => {
        const canonical = priceMap.get(String(item.product))?.price || 0;
        if (item.negotiationId && mongoose.Types.ObjectId.isValid(item.negotiationId)) {
          const neg = await Negotiation.findOne({
            _id:    item.negotiationId,
            item:   item.product,
            buyer:  req.user._id,
            status: "accepted",
          }).select("proposedPrice").lean();
          if (neg) return { ...item, resolvedPrice: neg.proposedPrice };
        }
        return { ...item, resolvedPrice: canonical };
      }));

      const subtotal = resolvedItems.reduce((sum, item) => sum + item.resolvedPrice * (item.quantity || 1), 0);
      const deliveryFee = productIds.reduce((s, pid) => s + Math.max(0, priceMap.get(pid)?.fee || 0), 0);
      const serviceCharge = calcServiceCharge(
        resolvedItems.map(i => ({ price: i.resolvedPrice, quantity: i.quantity || 1 })),
        feeConfig
      );
      const totalAmount = subtotal + deliveryFee + serviceCharge;

      // Build order items using DB-verified prices
      const orderItems = resolvedItems.map(item => ({
        product:  item.product,
        quantity: item.quantity || 1,
        price:    item.resolvedPrice,
        ...(item.negotiationId && { negotiationId: item.negotiationId }),
      }));

      const order = new Order({
        buyer: req.user._id,
        seller: sellerId,
        items: orderItems,
        subtotal,
        serviceCharge,
        deliveryFee,
        totalAmount,
        shippingAddress,
        notes,
        paymentMethod: "transfer",
        paymentStatus: "pending",
        status: "pending-verification",
        deliveryCode: generateDeliveryCode(),
        paymentInfo: {
          reference: `TRANSFER-${Date.now()}`,
          transactionId: null,
          paidAt: null,
        },
        paymentProof: paymentProofPath,
      });

      await order.save();
      createdOrders.push(order._id);
    }


    return res.status(201).json({
      success: true,
      message: "Transfer recorded. Awaiting admin verification.",
      orderIds: createdOrders,
      proof: paymentProofPath,
    });
  } catch (err) {
    logger.error("❌ Transfer confirmation failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to confirm transfer",
      error: err.message,
    });
  }
};

export const getEscrowDetails = async (req, res) => {
  try {
    const escrowDetails = {
      bankName: process.env.ESCROW_BANK_NAME || "Example Bank",
      accountNumber: process.env.ESCROW_ACCOUNT_NUMBER || "1234567890",
      accountName: process.env.ESCROW_ACCOUNT_NAME || "UMP Escrow Services",
    };

    res.json({ success: true, data: escrowDetails });
  } catch (err) {
    logger.error("❌ Failed to load escrow details:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch escrow info" });
  }
};

