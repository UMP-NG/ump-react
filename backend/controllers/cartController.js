import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import logger from "../utils/logger.js";

// ✅ Get current user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || !cart.items.length) {
      return res.json({ items: [], message: "🛒 Your cart is empty" });
    }

    // Remove items whose product was deleted (populate returns null for missing refs)
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => item.product != null);
    if (cart.items.length !== before) await cart.save();

    res.json({ items: cart.items });
  } catch (error) {
    logger.error("❌ Error fetching cart:", error);
    res.status(500).json({ message: "Failed to load cart" });
  }
};

// ✅ Add product to cart with detailed logging
export const addToCart = async (req, res) => {
  try {

    const { productId, quantity = 1, selectedColor = "", selectedSize = "", selectedType = "", selectedVariant = "" } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      logger.warn("❌ Unauthorized attempt to add to cart");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      logger.warn("❌ Invalid product ID:", productId);
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Validate quantity
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      logger.warn("❌ Invalid quantity:", quantity);
      return res
        .status(400)
        .json({ message: "Quantity must be a positive number" });
    }

    // Check product existence
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn("❌ Product not found:", productId);
      return res.status(404).json({ message: "Product not found" });
    }

    // Resolve the selected variant (if this product has variants) — the price
    // and stock charged/checked must come from the SPECIFIC variant chosen,
    // not the product's base price (which is just the cheapest variant).
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    let matchedVariant = null;
    if (hasVariants) {
      if (!selectedVariant) {
        return res.status(400).json({ message: "Please select a variant" });
      }
      matchedVariant = product.variants.find((v) => v.label === selectedVariant);
      if (!matchedVariant) {
        return res.status(400).json({ message: "Selected variant is no longer available" });
      }
    }
    const itemPrice = matchedVariant ? matchedVariant.price : product.price;
    const itemStock = matchedVariant ? (matchedVariant.stock || 0) : (product.stock || 0);

    if (itemStock <= 0) {
      return res.status(400).json({ message: "This product is out of stock" });
    }

    // Prevent seller from buying their own products
    if (product.seller?.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot add your own products to your cart" });
    }

    // Block items from a temporarily closed store
    const sellerStore = await Seller.findOne({ user: product.seller }).select("isOpen storeName").lean();
    if (sellerStore && sellerStore.isOpen === false) {
      return res.status(400).json({ message: `${sellerStore.storeName || "This store"} is temporarily closed. Please check back later.` });
    }

    // Find or create user's cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists in cart (same product + same variant/option combination)
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        (item.selectedColor   || "") === selectedColor &&
        (item.selectedSize    || "") === selectedSize &&
        (item.selectedType    || "") === selectedType &&
        (item.selectedVariant || "") === selectedVariant
    );

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (newQty > itemStock) {
        return res.status(400).json({ message: `Only ${itemStock} left in stock — you already have ${existingItem.quantity} in your cart.` });
      }
      existingItem.quantity = newQty;
      existingItem.price = itemPrice; // keep in sync in case the variant's price changed since it was first added
    } else {
      if (qty > itemStock) {
        return res.status(400).json({ message: `Only ${itemStock} left in stock` });
      }
      cart.items.push({
        product: productId,
        quantity: qty,
        price: itemPrice,
        selectedColor,
        selectedSize,
        selectedType,
        selectedVariant,
      });
    }

    await cart.save();

    res.json({ message: "✅ Product added to cart", cart });
  } catch (error) {
    logger.error("❌ Error adding to cart:", error);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// ✅ Update item quantity
export const updateQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Match by subdocument _id so two variants of the same product update independently
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found in cart" });

    const product = await Product.findById(item.product).select("stock variants").lean();
    if (product) {
      const matchedVariant = item.selectedVariant
        ? product.variants?.find((v) => v.label === item.selectedVariant)
        : null;
      const itemStock = matchedVariant ? (matchedVariant.stock || 0) : (product.stock || 0);
      if (quantity > itemStock) {
        return res.status(400).json({ message: `Only ${itemStock} left in stock` });
      }
    }

    item.quantity = Math.max(1, quantity);
    await cart.save();

    res.json({ message: "✅ Quantity updated", cart });
  } catch (error) {
    logger.error("❌ Error updating quantity:", error);
    res.status(500).json({ message: "Failed to update quantity" });
  }
};

// ✅ Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Match by subdocument _id so only the specific variant is removed
    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    await cart.save();

    res.json({ message: "🗑️ Item removed", cart });
  } catch (error) {
    logger.error("❌ Error removing item:", error);
    res.status(500).json({ message: "Failed to remove item" });
  }
};

// ✅ Checkout and create order
export const checkoutCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "🛒 Cart is empty" });
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.negotiatedPrice ?? item.product?.price ?? item.price,
    }));

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const newOrder = new Order({
      buyer: userId,
      seller: cart.items[0]?.product?.seller || null,
      items: orderItems,
      totalAmount,
      shippingAddress: req.body.shippingAddress || "",
    });

    await newOrder.save();
    await Cart.deleteOne({ user: userId }); // ✅ clear cart after order

    res.json({ message: "✅ Order created successfully", order: newOrder });
  } catch (error) {
    logger.error("❌ Checkout failed:", error);
    res.status(500).json({ message: "Checkout failed" });
  }
};

