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

// ── Category cache ────────────────────────────────────────────────────────────
const _catCache = { data: null, ts: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ── Address code cache ────────────────────────────────────────────────────────
// Shipbubble charges per /address/validate call. Cache codes by canonical address
// string to avoid re-validating the same seller pickup address on every rate fetch.
const _addrCache = new Map(); // canonicalAddress → { code, ts }
const ADDR_TTL   = 23 * 60 * 60 * 1000; // 23 hours (codes appear stable for 24h)
const ADDR_MAX   = 500;

async function fetchCategories(api) {
  if (_catCache.data?.length && Date.now() - _catCache.ts < CACHE_TTL) return _catCache.data;
  try {
    const res = await api.get("/shipping/labels/categories");
    const cats = res.data?.data;
    if (cats?.length) {
      _catCache.data = cats;
      _catCache.ts = Date.now();
    }
  } catch (err) {
    logger.warn("Shipbubble fetchCategories:", err.response?.data || err.message);
  }
  return _catCache.data || [];
}

async function defaultCategoryId(api) {
  const cats = await fetchCategories(api);
  // "Light weight items" is the safest default for general marketplace items
  const match = cats.find((c) => /light/i.test(c.category));
  return (match || cats[0])?.category_id || null;
}

// ── Address validation ────────────────────────────────────────────────────────
async function validateAddress(api, addr) {
  const streetPart = addr.street || addr.address || "";
  const fullAddress = [streetPart, addr.city, addr.state, "Nigeria"]
    .filter(Boolean)
    .join(", ");

  const cacheKey = fullAddress.toLowerCase().trim();
  const hit = _addrCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < ADDR_TTL) {
    return { address_code: hit.code };
  }

  const res = await api.post("/shipping/address/validate", {
    name:    addr.name  || "UMP User",
    phone:   addr.phone || "08000000000",
    email:   addr.email || "noreply@myump.com.ng",
    address: fullAddress,
    city:    addr.city  || "",
    state:   addr.state || "",
    country: "Nigeria",
  });
  const data = res.data?.data;
  if (!data?.address_code) throw new Error("Address validation returned no code");

  if (_addrCache.size >= ADDR_MAX) _addrCache.delete(_addrCache.keys().next().value);
  _addrCache.set(cacheKey, { code: data.address_code, ts: Date.now() });

  return data;
}

function buildParcel(parcel = {}) {
  const qty        = parcel.quantity || 1;
  const unitWeight = parcel.weight   ? parcel.weight / qty : 1.5; // kg per item
  return {
    package_dimension: {
      length: parcel.length              || 30,
      width:  parcel.breadth || parcel.width || 25,
      height: parcel.height              || 20,
      weight: parcel.weight              || unitWeight * qty,
    },
    package_items: [{
      name:        parcel.name        || "Marketplace item",
      description: parcel.description || "Student marketplace item",
      quantity:    qty,
      unit_amount: parcel.value       || 10000,
      unit_weight: unitWeight,
    }],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getRates({ sender, recipient, parcel }) {
  try {
    const api = client();
    const [senderData, recipientData, catId] = await Promise.all([
      validateAddress(api, sender),
      validateAddress(api, recipient),
      defaultCategoryId(api),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const { package_dimension, package_items } = buildParcel(parcel);

    const res = await api.post("/shipping/fetch_rates", {
      sender_address_code:   senderData.address_code,
      reciever_address_code: recipientData.address_code,
      pickup_date:           today,
      category_id:           catId,
      package_dimension,
      package_items,
    });

    return res.data?.data?.couriers || [];
  } catch (err) {
    const sbMsg = err.response?.data?.message || err.message || "";
    logger.error("Shipbubble getRates:", err.response?.data || err.message);
    // Shipbubble wallet errors are platform-level — don't expose them to buyers
    if (/wallet|balance|fund/i.test(sbMsg)) {
      throw new Error("Courier rates are temporarily unavailable. Please try another delivery method or contact the seller.");
    }
    throw new Error(sbMsg || "Failed to fetch shipping rates");
  }
}

export async function createShipment({ serviceCode, sender, recipient, parcel, orderId }) {
  try {
    const api = client();
    const [senderData, recipientData, catId] = await Promise.all([
      validateAddress(api, sender),
      validateAddress(api, recipient),
      defaultCategoryId(api),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const { package_dimension, package_items } = buildParcel(parcel);

    const res = await api.post("/shipping/labels", {
      service_code:          serviceCode,
      sender_address_code:   senderData.address_code,
      reciever_address_code: recipientData.address_code,
      pickup_date:           today,
      category_id:           catId,
      package_dimension,
      package_items,
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

// GET /api/delivery/locations
// Shipbubble has no states/cities API — return hardcoded Nigerian states so the
// frontend can offer a state dropdown while city stays as a free-text input.
export async function getLocations() {
  return NIGERIAN_STATES;
}

const NIGERIAN_STATES = [
  { name: "Abia",         code: "AB" },
  { name: "Adamawa",      code: "AD" },
  { name: "Akwa Ibom",    code: "AK" },
  { name: "Anambra",      code: "AN" },
  { name: "Bauchi",       code: "BA" },
  { name: "Bayelsa",      code: "BY" },
  { name: "Benue",        code: "BE" },
  { name: "Borno",        code: "BO" },
  { name: "Cross River",  code: "CR" },
  { name: "Delta",        code: "DE" },
  { name: "Ebonyi",       code: "EB" },
  { name: "Edo",          code: "ED" },
  { name: "Ekiti",        code: "EK" },
  { name: "Enugu",        code: "EN" },
  { name: "FCT (Abuja)",  code: "FC" },
  { name: "Gombe",        code: "GO" },
  { name: "Imo",          code: "IM" },
  { name: "Jigawa",       code: "JI" },
  { name: "Kaduna",       code: "KD" },
  { name: "Kano",         code: "KN" },
  { name: "Katsina",      code: "KT" },
  { name: "Kebbi",        code: "KE" },
  { name: "Kogi",         code: "KO" },
  { name: "Kwara",        code: "KW" },
  { name: "Lagos",        code: "LA" },
  { name: "Nasarawa",     code: "NA" },
  { name: "Niger",        code: "NI" },
  { name: "Ogun",         code: "OG" },
  { name: "Ondo",         code: "ON" },
  { name: "Osun",         code: "OS" },
  { name: "Oyo",          code: "OY" },
  { name: "Plateau",      code: "PL" },
  { name: "Rivers",       code: "RI" },
  { name: "Sokoto",       code: "SO" },
  { name: "Taraba",       code: "TA" },
  { name: "Yobe",         code: "YO" },
  { name: "Zamfara",      code: "ZA" },
];
