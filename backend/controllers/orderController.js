import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Cart from "../models/Cart.js";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import cloudinary from "../config/cloudinary.js";
import paystack from "../utils/paystack.js";

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
        product: {
          _id: product._id,
          name: product.name,
          image: product.image,
          sku: product.sku,
        },
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
      status: "processing",
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

    const items = cart.items.map((i) => ({
      product: i.product._id,
      quantity: i.quantity,
      price: i.product.price,
      variant: i.variant || {},
    }));

    const sellerId = cart.items[0].product.seller;
    if (!sellerId)
      return res.status(400).json({ message: "Cannot determine seller" });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // Charge each product's delivery fee once — deduplicate by product ID
    const seenPids = new Set();
    const deliveryFee = cart.items.reduce((s, i) => {
      const pid = i.product._id?.toString();
      if (pid && seenPids.has(pid)) return s;
      if (pid) seenPids.add(pid);
      return s + Math.max(0, i.product.deliveryFee || 0);
    }, 0);
    const totalAmount = subtotal + deliveryFee;

    const order = new Order({
      buyer: userId,
      seller: sellerId,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      shippingAddress: shippingAddress || {},
      paymentMethod,
      status: "pending",
      deliveryCode: generateDeliveryCode(),
    });

    await order.save();

    cart.items = [];
    await cart.save();

    return res.status(201).json({ success: true, order });
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

    const filter = { "items.product": { $in: productIds } };

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

    // Enforce forward-only transitions (cancellation is always allowed)
    const FLOW = { pending: 0, confirmed: 1, shipped: 2, completed: 3 };
    if (status !== "cancelled" && FLOW[status] <= FLOW[order.status])
      return res.status(400).json({ message: `Cannot move from "${order.status}" to "${status}"` });

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
      status: { $ne: "canceled" },
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
// Called by SELLER — submits the delivery code given to them by the buyer in person.
// On success, 95% of the order total is transferred to the seller's bank via Paystack.
export const confirmDelivery = async (req, res) => {
  try {
    const { deliveryCode } = req.body;
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
      // Allow seller who owns one of the products
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

    const UMP_FEE = 0.05; // 5%
    const transferAmount = Math.floor(order.totalAmount * (1 - UMP_FEE)); // naira → keep as naira, convert to kobo below
    const amountKobo = transferAmount * 100;

    // Fire Paystack transfer
    const transferRef = `ESCROW_${order._id}_${Date.now()}`;
    const transferRes = await paystack.post("/transfer", {
      source: "balance",
      reason: `UMP order payout — Order #${order._id}`,
      amount: amountKobo,
      recipient: seller.bankDetails.paystackRecipientCode,
      reference: transferRef,
    });

    const transferData = transferRes.data?.data;

    // Mark delivery code as used immediately; full completion happens on transfer.success webhook
    order.deliveryCodeUsed = true;
    order.status = "completed";
    order.paymentStatus = "released";
    order.escrowReleasedAt = new Date();
    await order.save();

    // Update seller analytics optimistically
    await Seller.findByIdAndUpdate(seller._id, {
      $inc: {
        pendingPayout: transferAmount,
        totalRevenue: order.totalAmount,
        totalOrders: 1,
      },
      $push: {
        payoutHistory: {
          amount: transferAmount,
          status: transferData?.status === "success" ? "paid" : "pending",
          referenceId: transferRef,
        },
      },
    });

    // Reduce stock
    for (const item of order.items) {
      const productId = item.product?._id || item.product;
      if (productId) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: -Math.abs(item.quantity), sold: item.quantity, purchases: item.quantity },
        });
      }
    }

    res.json({
      success: true,
      message: "Delivery confirmed. Transfer initiated to seller.",
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

