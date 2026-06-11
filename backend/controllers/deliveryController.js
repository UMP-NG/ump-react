import Order  from "../models/Order.js";
import Seller from "../models/Seller.js";
import { getRates, createShipment, trackShipment } from "../utils/shipbubble.js";
import { notify } from "../utils/notify.js";
import logger from "../utils/logger.js";

// GET /api/delivery/quote?sellerId=&buyerName=&buyerPhone=&buyerStreet=&buyerCity=&buyerState=
// Returns live Shipbubble rates for a seller → buyer address pair.
export const getDeliveryQuote = async (req, res) => {
  try {
    const { sellerId, buyerName, buyerPhone, buyerStreet, buyerCity, buyerState } = req.query;

    if (!sellerId) return res.status(400).json({ message: "sellerId is required" });
    if (!buyerCity || !buyerState)
      return res.status(400).json({ message: "buyerCity and buyerState are required" });

    const seller = await Seller.findOne({ user: sellerId })
      .select("delivery storeName")
      .lean();
    if (!seller?.delivery?.shipbubble?.enabled)
      return res.status(400).json({ message: "This seller does not offer Shipbubble delivery" });

    const pickup = seller.delivery.shipbubble.pickupAddress;
    if (!pickup?.city || !pickup?.state)
      return res.status(400).json({ message: "Seller has not configured their pickup address" });

    const rates = await getRates({
      sender: {
        name:   pickup.name  || seller.storeName || "Seller",
        email:  pickup.email || "",
        phone:  pickup.phone || "",
        street: pickup.street || "",
        city:   pickup.city,
        state:  pickup.state,
      },
      recipient: {
        name:   buyerName  || "Buyer",
        email:  "",
        phone:  buyerPhone || "",
        street: buyerStreet || "",
        city:   buyerCity,
        state:  buyerState,
      },
      parcel: { weight: 0.5 },
    });

    return res.json({
      success: true,
      rates: rates.map((r) => ({
        serviceCode:    r.service_code || r.code,
        courierName:    r.courier_name || r.courier || r.name,
        amount:         r.amount || r.fee || 0,
        estimatedDays:  r.estimated_days || r.delivery_duration || "",
        logoUrl:        r.logo_url || r.logo || null,
      })),
    });
  } catch (err) {
    logger.error("getDeliveryQuote:", err.message);
    return res.status(502).json({ message: err.message || "Failed to get delivery rates" });
  }
};

// POST /api/delivery/book/:orderId
// Called by seller when items are ready — creates a Shipbubble shipment.
export const bookShipbubbleDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Auth check before any sensitive data is revealed
    const isAdmin = req.user.roles?.includes("admin");
    const uid     = req.user._id.toString();
    if (!isAdmin && order.seller?.toString() !== uid)
      return res.status(403).json({ message: "Not authorised" });

    if (order.deliveryMethod !== "shipbubble")
      return res.status(400).json({ message: "This order is not a Shipbubble delivery" });

    if (order.paymentStatus !== "paid")
      return res.status(400).json({ message: "Cannot book dispatch — payment not confirmed" });

    if (order.shipbubble?.shipmentId)
      return res.status(400).json({ message: "Shipment already booked", trackingNumber: order.shipbubble.trackingNumber });

    const seller = await Seller.findOne({ user: order.seller }).select("delivery storeName").lean();
    if (!seller)
      return res.status(404).json({ message: "Seller profile not found" });
    if (!seller.delivery?.shipbubble?.pickupAddress?.city)
      return res.status(400).json({ message: "Seller has not configured a Shipbubble pickup address" });

    const serviceCode = req.body.serviceCode || order.shipbubble?.serviceCode;
    if (!serviceCode) return res.status(400).json({ message: "serviceCode is required — buyer must select a courier" });

    const pickup = seller.delivery.shipbubble.pickupAddress;
    const ship   = order.shippingAddress || {};

    const shipment = await createShipment({
      serviceCode,
      sender: {
        name:   pickup.name  || seller.storeName || "Seller",
        email:  pickup.email || "noreply@myump.com.ng",
        phone:  pickup.phone || "",
        street: pickup.street || "",
        city:   pickup.city,
        state:  pickup.state,
      },
      recipient: {
        name:   ship.name   || "Buyer",
        email:  "",
        phone:  ship.phone  || "",
        street: ship.address || ship.street || "",
        city:   ship.city   || "",
        state:  ship.state  || "",
      },
      parcel: { weight: 0.5, description: "Marketplace items" },
      orderId: order._id,
    });

    order.shipbubble = {
      shipmentId:    shipment.shipment_id   || shipment.id,
      trackingNumber: shipment.tracking_number || shipment.trackingNumber,
      trackingUrl:   shipment.tracking_url  || null,
      courierName:   shipment.courier_name  || null,
      status:        "booked",
    };
    order.status = "shipped";
    await order.save();

    notify(order.buyer, {
      type:    "order",
      title:   "Your order is on the way!",
      message: `Your order has been dispatched via ${order.shipbubble.courierName || "courier"}. Tracking: ${order.shipbubble.trackingNumber || "—"}`,
      link:    "/orders",
    }).catch(() => {});

    return res.json({
      success: true,
      trackingNumber: order.shipbubble.trackingNumber,
      trackingUrl:    order.shipbubble.trackingUrl,
      shipmentId:     order.shipbubble.shipmentId,
    });
  } catch (err) {
    logger.error("bookShipbubbleDelivery:", err.message);
    return res.status(500).json({ message: err.message || "Failed to book shipment" });
  }
};

// GET /api/delivery/track/:orderId
export const getTrackingInfo = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select("buyer seller shipbubble deliveryMethod").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const uid      = req.user._id.toString();
    const isAdmin  = req.user.roles?.includes("admin");
    const canView  = isAdmin || order.buyer?.toString() === uid || order.seller?.toString() === uid;
    if (!canView) return res.status(403).json({ message: "Not authorised" });

    if (order.deliveryMethod !== "shipbubble" || !order.shipbubble?.shipmentId)
      return res.status(400).json({ message: "No Shipbubble tracking for this order" });

    const tracking = await trackShipment(order.shipbubble.shipmentId);
    return res.json({ success: true, tracking, saved: order.shipbubble });
  } catch (err) {
    logger.error("getTrackingInfo:", err.message);
    return res.status(500).json({ message: err.message || "Failed to get tracking info" });
  }
};
