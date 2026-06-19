import mongoose from "mongoose";
import Negotiation from "../models/Negotiation.js";
import Message from "../models/Message.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import { getIO } from "../utils/socket.js";
import logger from "../utils/logger.js";
import { notify } from "../utils/notify.js";

// Normalise image data which may be stored as a string URL or as { url, publicId }
function extractImage(img) {
  if (!img) return null;
  if (typeof img === "string") return img || null;
  return img.url || null;
}

// POST /api/negotiations
// Buyer proposes a price for a product or service
export const createNegotiation = async (req, res) => {
  try {
    const { itemType, itemId, proposedPrice } = req.body;
    const buyerId = req.user._id;

    if (!["Product", "Service"].includes(itemType)) {
      return res.status(400).json({ message: "Invalid item type" });
    }

    const parsed = Number(proposedPrice);
    if (!parsed || parsed <= 0) {
      return res.status(400).json({ message: "Invalid proposed price" });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    let originalPrice, itemName, itemImage, sellerId;

    if (itemType === "Product") {
      const product = await Product.findById(itemId).select("name price images seller");
      if (!product) return res.status(404).json({ message: "Product not found" });
      if (!product.seller) return res.status(400).json({ message: "This product has no seller" });
      originalPrice = product.price;
      itemName = product.name;
      itemImage = extractImage(product.images?.[0]);
      sellerId = product.seller;
    } else {
      const service = await Service.findById(itemId).select("title name rate images provider");
      if (!service) return res.status(404).json({ message: "Service not found" });
      if (!service.rate) return res.status(400).json({ message: "This service has no fixed rate to negotiate" });
      if (!service.provider) return res.status(400).json({ message: "This service has no provider" });
      originalPrice = service.rate;
      itemName = service.title || service.name;
      itemImage = extractImage(service.images?.[0]);
      sellerId = service.provider;
    }

    // Prevent negotiating with yourself
    if (sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({ message: "You cannot negotiate with yourself" });
    }

    if (parsed >= originalPrice) {
      return res.status(400).json({ message: "Proposed price must be lower than the original price" });
    }

    // One active negotiation per buyer+item
    const existing = await Negotiation.findOne({ buyer: buyerId, item: itemId, status: "pending" });
    if (existing) {
      return res.status(409).json({ message: "You already have a pending negotiation for this item" });
    }

    const negotiation = await Negotiation.create({
      buyer: buyerId,
      seller: sellerId,
      itemType,
      item: itemId,
      itemName,
      itemImage,
      originalPrice,
      proposedPrice: parsed,
    });

    const meta = { itemType, itemId, itemName, itemImage, originalPrice, proposedPrice: parsed, status: "pending" };

    const message = await Message.create({
      sender: buyerId,
      receiver: sellerId,
      text: `Negotiate price: ${itemName}`,
      type: "negotiation",
      negotiationId: negotiation._id,
      meta,
    });

    negotiation.messageId = message._id;
    await negotiation.save();

    const io = getIO();
    if (io) {
      const populated = await message.populate("sender receiver", "name avatar roles");
      io.to(sellerId.toString()).emit("new_message", populated);
      io.to(buyerId.toString()).emit("new_message", populated);
    }

    notify(sellerId.toString(), {
      type: "account",
      title: "New price offer",
      message: `Someone offered ₦${Number(parsed).toLocaleString()} for "${itemName}"`,
      link: "/messages",
    }).catch(() => {});

    res.status(201).json({ success: true, negotiation, message });
  } catch (err) {
    logger.error("❌ Error creating negotiation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/negotiations/:id/respond
// Seller accepts, rejects, or counters a pending negotiation.
// Buyer accepts or rejects a counter offer (status === "countered").
export const respondToNegotiation = async (req, res) => {
  try {
    const { action, counterPrice: rawCounter } = req.body;
    const { id } = req.params;
    const userId = req.user._id;

    if (!["accept", "reject", "counter"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accept', 'reject', or 'counter'" });
    }

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    const isSeller = negotiation.seller.toString() === userId.toString();
    const isBuyer  = negotiation.buyer.toString()  === userId.toString();

    if (negotiation.status === "pending") {
      if (!isSeller) return res.status(403).json({ message: "Only the seller can respond to this negotiation" });
    } else if (negotiation.status === "countered") {
      if (!isBuyer) return res.status(403).json({ message: "Only the buyer can respond to a counter offer" });
      if (action === "counter") return res.status(400).json({ message: "Cannot counter again — please accept or reject" });
    } else {
      return res.status(400).json({ message: "This negotiation has already been responded to" });
    }

    const io = getIO();

    // ── Counter offer ────────────────────────────────────────────────────────
    if (action === "counter") {
      const cp = Number(rawCounter);
      if (!cp || cp <= negotiation.proposedPrice || cp >= negotiation.originalPrice) {
        return res.status(400).json({ message: "Counter price must be between the buyer's offer and original price" });
      }
      negotiation.counterPrice = cp;
      negotiation.status = "countered";
      await negotiation.save();

      if (negotiation.messageId) {
        await Message.findByIdAndUpdate(negotiation.messageId, { "meta.status": "countered" });
      }

      const counterMeta = {
        itemType: negotiation.itemType,
        itemId: negotiation.item,
        itemName: negotiation.itemName,
        itemImage: negotiation.itemImage,
        originalPrice: negotiation.originalPrice,
        proposedPrice: negotiation.proposedPrice,
        counterPrice: cp,
        status: "countered",
        isResponse: true,
        isCounter: true,
        canApply: false,
        negotiationId: negotiation._id,
      };

      const counterMsg = await Message.create({
        sender: userId,
        receiver: negotiation.buyer,
        text: `Counter offer for "${negotiation.itemName}" — ₦${Number(cp).toLocaleString()}`,
        type: "negotiation",
        negotiationId: negotiation._id,
        meta: counterMeta,
      });

      if (io) {
        const populated = await counterMsg.populate("sender receiver", "name avatar roles");
        io.to(negotiation.buyer.toString()).emit("new_message", populated);
        io.to(userId.toString()).emit("new_message", populated);
        io.to(negotiation.buyer.toString()).emit("negotiation_update", {
          negotiationId: negotiation._id,
          status: "countered",
        });
      }

      notify(negotiation.buyer.toString(), {
        type: "account",
        title: "Counter offer received",
        message: `The seller countered at ₦${Number(cp).toLocaleString()} for "${negotiation.itemName}"`,
        link: "/messages",
      }).catch(() => {});

      return res.json({ success: true, negotiation });
    }

    // ── Accept or reject ─────────────────────────────────────────────────────
    const isCounterResponse = negotiation.status === "countered";

    if (action === "accept" && isCounterResponse) {
      negotiation.proposedPrice = negotiation.counterPrice;
    }

    negotiation.status = action === "accept" ? "accepted" : "rejected";
    await negotiation.save();

    if (negotiation.messageId) {
      await Message.findByIdAndUpdate(negotiation.messageId, { "meta.status": negotiation.status });
    }

    // Always create the final response message as seller→buyer so iAmSeller
    // logic in the frontend remains consistent regardless of who acted last.
    const finalMeta = {
      itemType: negotiation.itemType,
      itemId: negotiation.item,
      itemName: negotiation.itemName,
      itemImage: negotiation.itemImage,
      originalPrice: negotiation.originalPrice,
      proposedPrice: negotiation.proposedPrice,
      status: negotiation.status,
      isResponse: true,
      canApply: action === "accept",
      negotiationId: negotiation._id,
    };

    const responseText = action === "accept"
      ? `Negotiation accepted for "${negotiation.itemName}" — ₦${Number(negotiation.proposedPrice).toLocaleString()}`
      : isCounterResponse
        ? `Counter offer declined for "${negotiation.itemName}" — original price applies`
        : `Negotiation rejected for "${negotiation.itemName}" — original price applies`;

    const responseMsg = await Message.create({
      sender: negotiation.seller,
      receiver: negotiation.buyer,
      text: responseText,
      type: "negotiation",
      negotiationId: negotiation._id,
      meta: finalMeta,
    });

    if (io) {
      const populated = await responseMsg.populate("sender receiver", "name avatar roles");
      io.to(negotiation.buyer.toString()).emit("new_message", populated);
      io.to(negotiation.seller.toString()).emit("new_message", populated);
      io.to(negotiation.buyer.toString()).emit("negotiation_update", {
        negotiationId: negotiation._id,
        status: negotiation.status,
      });
      io.to(negotiation.seller.toString()).emit("negotiation_update", {
        negotiationId: negotiation._id,
        status: negotiation.status,
      });
    }

    const notifyTarget = isCounterResponse ? negotiation.seller.toString() : negotiation.buyer.toString();
    notify(notifyTarget, {
      type: "account",
      title: action === "accept"
        ? (isCounterResponse ? "Counter offer accepted!" : "Offer accepted!")
        : (isCounterResponse ? "Counter offer declined" : "Offer rejected"),
      message: action === "accept"
        ? `${isCounterResponse ? "Your counter offer" : "The offer"} of ₦${Number(negotiation.proposedPrice).toLocaleString()} for "${negotiation.itemName}" was accepted!`
        : `${isCounterResponse ? "Your counter offer" : "The offer"} for "${negotiation.itemName}" was declined.`,
      link: "/messages",
    }).catch(() => {});

    res.json({ success: true, negotiation });
  } catch (err) {
    logger.error("❌ Error responding to negotiation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/negotiations/:id/apply
// Seller applies the accepted negotiated price to the buyer's cart
export const applyNegotiatedPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const negotiation = await Negotiation.findById(id);
    if (!negotiation) return res.status(404).json({ message: "Negotiation not found" });

    if (negotiation.seller.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the seller can apply this price" });
    }

    if (negotiation.status !== "accepted") {
      return res.status(400).json({ message: negotiation.status === "applied" ? "Price has already been applied to the buyer's cart" : "Negotiation must be accepted before applying" });
    }

    if (negotiation.itemType !== "Product") {
      return res.status(400).json({ message: "Cart price application is for products only — services are handled via booking" });
    }

    const buyerId = negotiation.buyer;
    let cart = await Cart.findOne({ user: buyerId });
    if (!cart) cart = new Cart({ user: buyerId, items: [] });

    const existing = cart.items.find(
      (i) => i.product.toString() === negotiation.item.toString()
    );

    if (existing) {
      existing.negotiatedPrice = negotiation.proposedPrice;
      existing.negotiationId = negotiation._id;
    } else {
      cart.items.push({
        product: negotiation.item,
        quantity: 1,
        price: negotiation.originalPrice,
        negotiatedPrice: negotiation.proposedPrice,
        negotiationId: negotiation._id,
      });
    }

    await cart.save();

    // Mark as applied so it cannot be re-applied
    negotiation.status = "applied";
    await negotiation.save();

    // Persist _applied on the response message so the badge survives page refresh
    await Message.updateMany(
      { negotiationId: negotiation._id, "meta.isResponse": true, "meta.canApply": true },
      { $set: { "meta._applied": true } }
    );

    const io = getIO();
    if (io) {
      io.to(buyerId.toString()).emit("cart_updated", {
        message: `"${negotiation.itemName}" added at your negotiated price ₦${Number(negotiation.proposedPrice).toLocaleString("en-NG")}!`,
        negotiationId: negotiation._id,
      });
    }

    // Push notification so buyer sees this even when the tab is closed
    notify(buyerId, {
      type: "message",
      title: "Negotiated price added to cart",
      message: `"${negotiation.itemName}" is now in your cart at ₦${Number(negotiation.proposedPrice).toLocaleString("en-NG")} — your negotiated price!`,
      link: "/cart",
    }).catch(() => {});

    res.json({ success: true, message: "Negotiated price applied to buyer's cart" });
  } catch (err) {
    logger.error("❌ Error applying negotiated price:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/negotiations
export const getMyNegotiations = async (req, res) => {
  try {
    const userId = req.user._id;
    const negotiations = await Negotiation.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("buyer", "name avatar")
      .populate("seller", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(negotiations);
  } catch (err) {
    logger.error("❌ Error fetching negotiations:", err);
    res.status(500).json({ message: "Server error" });
  }
};
