import axios from "axios";
import logger from "./logger.js";

const BASE = "https://api.shipbubble.com/v1";

function client() {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });
}

function buildSender(addr) {
  return {
    name:    addr.name  || "UMP Seller",
    email:   addr.email || "noreply@myump.com.ng",
    phone:   addr.phone || "",
    address: addr.street || "",
    city:    addr.city  || "",
    state:   addr.state || "",
  };
}

function buildParcel(parcel = {}) {
  return {
    packaging:    "box",
    package_type: "parcel",
    weight:       parcel.weight   || 0.5,
    length:       parcel.length   || 15,
    breadth:      parcel.breadth  || 15,
    height:       parcel.height   || 10,
    description:  parcel.description || "Marketplace items",
  };
}

export async function getRates({ sender, recipient, parcel }) {
  try {
    const res = await client().post("/shipping/fetch_rates", {
      sender_details:    buildSender(sender),
      recipient_details: buildSender(recipient),
      package_details:   buildParcel(parcel),
    });
    return res.data?.data?.rates || [];
  } catch (err) {
    logger.error("Shipbubble getRates:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to fetch shipping rates");
  }
}

export async function createShipment({ serviceCode, sender, recipient, parcel, orderId }) {
  try {
    const res = await client().post("/shipping/labels", {
      service_code:      serviceCode,
      sender_details:    buildSender(sender),
      recipient_details: buildSender(recipient),
      package_details:   buildParcel(parcel),
      metadata: { order_id: String(orderId) },
    });
    return res.data?.data || {};
  } catch (err) {
    logger.error("Shipbubble createShipment:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to create shipment");
  }
}

export async function trackShipment(shipmentId) {
  try {
    const res = await client().get(`/shipping/tracking/${shipmentId}`);
    return res.data?.data || {};
  } catch (err) {
    logger.error("Shipbubble trackShipment:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to fetch tracking info");
  }
}
