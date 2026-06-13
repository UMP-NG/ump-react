import axios from "axios";
import logger from "./logger.js";

const BASE = "https://api.shipbubble.com/v1";

function client() {
  if (!process.env.SHIPBUBBLE_API_KEY) {
    throw new Error("SHIPBUBBLE_API_KEY is not configured");
  }
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });
}

// ── Location code resolution ──────────────────────────────────────────────────
// Shipbubble requires an `address_code` in sender/recipient details.
// We fetch state → city codes from their locations API and cache for 6 h
// so we don't make extra round-trips on every quote request.

const _cache = { states: null, cities: {}, ts: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function fetchStates(api) {
  if (_cache.states && Date.now() - _cache.ts < CACHE_TTL) return _cache.states;
  try {
    const res = await api.get("/shipping/country/states");
    _cache.states = res.data?.data || [];
    _cache.ts = Date.now();
  } catch (err) {
    logger.warn("Shipbubble fetchStates:", err.response?.data || err.message);
    _cache.states = _cache.states || []; // keep stale data on failure
  }
  return _cache.states;
}

async function fetchCities(api, stateCode) {
  if (_cache.cities[stateCode]) return _cache.cities[stateCode];
  try {
    const res = await api.get(`/shipping/country/state/cities?state_code=${encodeURIComponent(stateCode)}`);
    _cache.cities[stateCode] = res.data?.data || [];
  } catch (err) {
    logger.warn(`Shipbubble fetchCities(${stateCode}):`, err.response?.data || err.message);
    _cache.cities[stateCode] = [];
  }
  return _cache.cities[stateCode];
}

const norm = (s) => (s || "").toLowerCase().trim();

// Returns the Shipbubble address_code for a given city + state, or null on failure.
async function resolveCode(api, cityName, stateName) {
  try {
    const states = await fetchStates(api);
    const state  = states.find(
      (s) => norm(s.name) === norm(stateName) || norm(s.code) === norm(stateName)
    );
    if (!state) {
      logger.warn(`Shipbubble: state not found — "${stateName}"`);
      return null;
    }

    const stateCode = state.code || state.state_code;
    const cities    = await fetchCities(api, stateCode);
    const city      = cities.find((c) => norm(c.name) === norm(cityName));
    if (!city) {
      logger.warn(`Shipbubble: city not found — "${cityName}" in "${stateName}"`);
      return null;
    }

    return city.code || city.city_code || null;
  } catch (err) {
    logger.warn("Shipbubble resolveCode:", err.message);
    return null;
  }
}

// Builds the address object Shipbubble expects, including address_code.
async function buildAddress(api, addr) {
  const code = await resolveCode(api, addr.city, addr.state);
  return {
    name:         addr.name   || "UMP Seller",
    email:        addr.email  || "noreply@myump.com.ng",
    phone:        addr.phone  || "",
    address:      addr.street || "",
    city:         addr.city   || "",
    state:        addr.state  || "",
    address_code: code || "",
  };
}

function buildParcel(parcel = {}) {
  return {
    packaging:    "box",
    package_type: "parcel",
    weight:       parcel.weight      || 0.5,
    length:       parcel.length      || 15,
    breadth:      parcel.breadth     || 15,
    height:       parcel.height      || 10,
    description:  parcel.description || "Marketplace items",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getRates({ sender, recipient, parcel }) {
  try {
    const api = client();
    const [senderDetails, recipientDetails] = await Promise.all([
      buildAddress(api, sender),
      buildAddress(api, recipient),
    ]);

    if (!senderDetails.address_code) {
      throw new Error(`Could not resolve Shipbubble location code for sender city "${sender.city}", state "${sender.state}". Check the seller's pickup address spelling.`);
    }
    if (!recipientDetails.address_code) {
      throw new Error(`Could not resolve Shipbubble location code for buyer city "${recipient.city}". Please check your city spelling.`);
    }

    const res = await api.post("/shipping/fetch_rates", {
      sender_details:    senderDetails,
      recipient_details: recipientDetails,
      package_details:   buildParcel(parcel),
    });
    return res.data?.data?.rates || [];
  } catch (err) {
    logger.error("Shipbubble getRates:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "Failed to fetch shipping rates");
  }
}

export async function createShipment({ serviceCode, sender, recipient, parcel, orderId }) {
  try {
    const api = client();
    const [senderDetails, recipientDetails] = await Promise.all([
      buildAddress(api, sender),
      buildAddress(api, recipient),
    ]);

    if (!senderDetails.address_code) {
      throw new Error(`Could not resolve Shipbubble location code for sender city "${sender.city}", state "${sender.state}". Check the seller's pickup address spelling.`);
    }
    if (!recipientDetails.address_code) {
      throw new Error(`Could not resolve Shipbubble location code for buyer city "${recipient.city}". Please check your city spelling.`);
    }

    const res = await api.post("/shipping/labels", {
      service_code:      serviceCode,
      sender_details:    senderDetails,
      recipient_details: recipientDetails,
      package_details:   buildParcel(parcel),
      metadata: { order_id: String(orderId) },
    });
    return res.data?.data || {};
  } catch (err) {
    logger.error("Shipbubble createShipment:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "Failed to create shipment");
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

// GET /api/delivery/locations[?state_code=XX]
// Without state_code returns the list of Nigerian states (with codes).
// With state_code returns the cities for that state.
// Exposed so the seller settings form can offer city/state pickers backed by
// real Shipbubble location data — guarantees names will resolve correctly.
export async function getLocations(stateCode = null) {
  const api = client();
  if (stateCode) return fetchCities(api, stateCode);
  return fetchStates(api);
}
