import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import cloudinary from "../config/cloudinary.js";
import paystack from "../utils/paystack.js";
import { audit } from "../utils/auditLog.js";
import { notify } from "../utils/notify.js";

function generateDeliveryCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const product = await Product.findById(item.product);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.product}` });
      }

      subtotal    += product.price * item.quantity;
      deliveryFee += Math.max(0, product.deliveryFee || 0);

      processedItems.push({
        product: product._id,
        quantity: item.quantity,
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
    console.error("Error creating order:", error);
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

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let { paymentMethod, shippingAddress } = req.body;
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

    const createdOrders = [];
    for (const [sid, sellerItems] of sellerGroups) {
      const orderItems = sellerItems.map((i) => ({
        product: i.product._id,
        quantity: i.quantity,
        price: i.product.price,
        variant: i.variant || {},
      }));

      const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const seenPids = new Set();
      const deliveryFee = sellerItems.reduce((s, i) => {
        const pid = i.product._id?.toString();
        if (pid && seenPids.has(pid)) return s;
        if (pid) seenPids.add(pid);
        return s + Math.max(0, i.product.deliveryFee || 0);
      }, 0);

      const order = new Order({
        buyer: userId,
        seller: new mongoose.Types.ObjectId(sid),
        items: orderItems,
        subtotal,
        deliveryFee,
        totalAmount: subtotal + deliveryFee,
        shippingAddress: shippingAddress || {},
        paymentMethod,
        status: "pending",
        deliveryCode: generateDeliveryCode(),
      });
      await order.save();
      createdOrders.push(order);
    }

    cart.items = [];
    await cart.save();

    const orderWord = createdOrders.length > 1 ? `${createdOrders.length} orders` : `order #${createdOrders[0]._id.toString().slice(-6).toUpperCase()}`;
    notify(userId, {
      type: "order",
      title: "Almost there!",
      message: `${orderWord.charAt(0).toUpperCase() + orderWord.slice(1)} created. Complete your payment to confirm.`,
      link: "/orders",
    });

    return res.status(201).json({ success: true, orders: createdOrders, order: createdOrders[0] });
  } catch (err) {
    console.error("❌ Checkout error:", err);
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
    console.error("Error fetching orders:", error);
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

    // filter by status
    if (req.query.status) filter.status = req.query.status;

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
    console.error("getSellerOrders error:", err);
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
    console.error("getOrderById error:", err);
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

    // Enforce forward-only transitions (cancellation is always allowed)
    const FLOW = { pending: 0, confirmed: 1, shipped: 2, completed: 3 };
    if (status !== "cancelled" && FLOW[status] <= FLOW[order.status])
      return res.status(400).json({ message: `Cannot move from "${order.status}" to "${status}"` });

    const previousStatus = order.status;
    order.status = status;

    // ── On COMPLETED: release escrow to seller ───────────────────────────────
    if (status === "completed") {
      order.paymentStatus = "released";
      order.escrowReleasedAt = new Date();

      const sellerId = order.seller || order.items[0]?.product?.seller;
      if (sellerId) {
        await Seller.findOneAndUpdate(
          { user: sellerId },
          {
            $inc: {
              pendingPayout: Math.floor(order.totalAmount * 0.95),
              totalRevenue: order.totalAmount,
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
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ message: err.message });
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

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Check if current user purchased a product
// ===============================
export const hasPurchased = async (req, res) => {
  try {
    const { productId } = req.params;
    const order = await Order.findOne({
      buyer: req.user._id,
      "items.product": productId,
      status: { $in: ["confirmed", "shipped", "completed"] },
    }).select("_id");
    res.json({ purchased: !!order });
  } catch (err) {
    console.error("hasPurchased:", err);
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
    console.error("raiseDispute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===============================
// Delete order (buyer/admin)
// ===============================
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params; // keep using :id if your route uses /orders/:id
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent direct deletion of paid orders
    if (order.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ message: "Paid orders require refund process" });
    }

    // Mark as canceled instead of deleting
    order.status = "canceled";
    await order.save();

    res.json({
      success: true,
      message: "Order canceled successfully",
      order,
    });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧾 Generate Invoice PDF
export const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const pdfPath = await generateInvoicePDF(order);
    res.download(pdfPath);
  } catch (error) {
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};

export const markOrderAsPaid = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = "paid";
    order.status = "processing";
    await order.save();

    // ✅ Update seller and product analytics
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.purchases += item.quantity;
        await product.save();

        // Update seller total sales
        const seller = await Seller.findOne({ user: product.seller });
        if (seller) {
          seller.totalSalesValue += item.price * item.quantity;
          seller.sold += item.quantity;
          await seller.save();
        }
      }
    }

    res.json({ message: "Order marked as paid and analytics updated", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add this in orderController.js
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
    console.error("getIncomingOrders error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const generateInvoicePDF = async (order) => {
  const pdfPath = path.join(__dirname, `../invoices/invoice-${order._id}.pdf`);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));

  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Order ID: ${order._id}`);
  doc.text(`Buyer: ${order.buyer?.name || "Unknown"}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
  doc.moveDown();

  doc.text("Items:", { underline: true });
  order.items.forEach((item) => {
    doc.text(
      `${item.product?.name || "Product"} - Qty: ${item.quantity} - ₦${
        item.price
      }`
    );
  });

  doc.moveDown();
  doc.text(`Total: ₦${order.totalAmount}`, { bold: true });
  doc.end();

  return pdfPath;
};

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

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid")
      return res.status(400).json({ message: "Payment not yet confirmed for this order" });

    if (order.deliveryCodeUsed)
      return res.status(400).json({ message: "Delivery already confirmed for this order" });

    if (order.deliveryCode !== deliveryCode.trim().toUpperCase())
      return res.status(400).json({ message: "Invalid delivery code" });

    // Verify seller owns this order
    const userId = req.user._id.toString();
    const sellerUserId = order.seller?.toString();
    if (sellerUserId && sellerUserId !== userId) {
      const products = await Product.find({ seller: req.user._id }).select("_id").lean();
      const productIds = products.map((p) => p._id.toString());
      const ownsItem = order.items.some((i) => productIds.includes((i.product?._id || i.product).toString()));
      if (!ownsItem) return res.status(403).json({ message: "Not authorized" });
    }

    // Look up seller profile for recipient code
    const seller = await Seller.findOne({ user: order.seller || req.user._id });
    if (!seller?.bankDetails?.paystackRecipientCode) {
      return res.status(400).json({
        message: "Seller has not set up bank details yet. Please add your bank account in the dashboard.",
      });
    }

    // Determine which pending items are being delivered now
    const pendingItems = order.items.filter((i) => i.status !== "completed");
    const toDeliver = deliveredItemIds?.length
      ? pendingItems.filter((i) => deliveredItemIds.includes(i._id.toString()))
      : pendingItems;

    if (toDeliver.length === 0)
      return res.status(400).json({ message: "No items selected for delivery" });

    const isPartial = toDeliver.length < pendingItems.length;

    const UMP_FEE = 0.05;

    // Pro-rate payout: (delivered item value / all item value) × totalAmount × (1 - fee)
    const allItemsSubtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveredSubtotal = toDeliver.reduce((s, i) => s + i.price * i.quantity, 0);
    const proportion = allItemsSubtotal > 0 ? deliveredSubtotal / allItemsSubtotal : 1;
    const transferAmount = Math.floor(order.totalAmount * proportion * (1 - UMP_FEE));
    const amountKobo = transferAmount * 100;

    // Fire Paystack transfer for this batch
    const transferRef = `ESCROW_${order._id}_${Date.now()}`;
    const transferRes = await paystack.post("/transfer", {
      source: "balance",
      reason: isPartial
        ? `UMP partial payout — Order #${order._id} (${toDeliver.length}/${order.items.length} items)`
        : `UMP order payout — Order #${order._id}`,
      amount: amountKobo,
      recipient: seller.bankDetails.paystackRecipientCode,
      reference: transferRef,
    });

    const transferData = transferRes.data?.data;

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

    // Update seller analytics
    await Seller.findByIdAndUpdate(seller._id, {
      $inc: {
        pendingPayout: transferAmount,
        totalRevenue: deliveredSubtotal,
        ...(isPartial ? {} : { totalOrders: 1 }),
      },
      $push: {
        payoutHistory: {
          amount: transferAmount,
          status: transferData?.status === "success" ? "paid" : "pending",
          referenceId: transferRef,
        },
      },
    });

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
        : "Delivery confirmed. Transfer initiated to seller.",
      transferStatus: transferData?.status,
      transferRef,
    });
  } catch (err) {
    console.error("confirmDelivery error:", err.response?.data || err.message);
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
    console.error("💥 getCurrentOrder error:", err);
    res.status(500).json({ message: "Failed to fetch current order" });
  }
};

export const confirmTransfer = async (req, res) => {
  try {
    const { orderInfo } = req.body;
    if (!orderInfo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing order details" });
    }

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
      const subtotal = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Batch-fetch product fees to avoid N+1 queries; charge each product once
      const productIds = [...new Set(sellerItems.map(i => i.product).filter(Boolean).map(String))];
      const productDocs = await Product.find({ _id: { $in: productIds } }).select("_id deliveryFee").lean();
      const feeMap = new Map(productDocs.map(p => [p._id.toString(), p.deliveryFee || 0]));
      const deliveryFee = productIds.reduce((s, pid) => s + Math.max(0, feeMap.get(pid) || 0), 0);
      const totalAmount = subtotal + deliveryFee;

      const order = new Order({
        buyer: req.user._id,
        seller: sellerId,
        items: sellerItems,
        subtotal,
        deliveryFee,
        totalAmount,
        shippingAddress,
        notes,
        paymentMethod: "transfer",
        paymentStatus: "pending",
        status: "pending-verification",
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
    console.error("❌ Transfer confirmation failed:", err);
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
    console.error("❌ Failed to load escrow details:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch escrow info" });
  }
};

