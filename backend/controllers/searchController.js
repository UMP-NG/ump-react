import Product from "../models/Product.js";
import Listing from "../models/Listing.js";
import Service from "../models/Service.js";
import Seller from "../models/Seller.js";
import logger from "../utils/logger.js";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const coerceStr = (v) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] || "" : "");

const MAX_QUERY_LEN = 200;
const validateQuery = (query, res) => {
  if (!query || query.trim() === "") {
    res.status(400).json({ message: "Please provide a search query" });
    return false;
  }
  if (query.length > MAX_QUERY_LEN) {
    res.status(400).json({ message: "Search query is too long" });
    return false;
  }
  return true;
};

// ✅ Search products
export const searchProducts = async (req, res) => {
  try {
    const query = coerceStr(req.query.query);
    if (!validateQuery(query, res)) return;

    const searchRegex = new RegExp(escapeRegex(query.trim()), "i");
    const products = await Product.find({ name: searchRegex }).limit(20);

    res.json(products);
  } catch (error) {
    logger.error("Product search error:", error);
    res.status(500).json({ message: "Server error while searching products" });
  }
};

// ✅ Search listings
export const searchListings = async (req, res) => {
  try {
    const query = coerceStr(req.query.query);
    if (!validateQuery(query, res)) return;

    const searchRegex = new RegExp(escapeRegex(query.trim()), "i");
    const listings = await Listing.find({
      $or: [{ name: searchRegex }, { description: searchRegex }, { location: searchRegex }],
    })
      .select("name type images location price rate beds baths distance available amenities")
      .limit(20)
      .lean();

    res.json(listings);
  } catch (error) {
    logger.error("Listing search error:", error);
    res.status(500).json({ message: "Server error while searching listings" });
  }
};

// ✅ Search services
export const searchServices = async (req, res) => {
  try {
    const query = coerceStr(req.query.query);
    if (!validateQuery(query, res)) return;

    const searchRegex = new RegExp(escapeRegex(query.trim()), "i");
    const services = await Service.find({
      $or: [{ title: searchRegex }, { name: searchRegex }, { major: searchRegex }, { desc: searchRegex }],
    })
      .select("title name images major desc rate rating provider available")
      .limit(20)
      .lean();

    res.json(services);
  } catch (error) {
    logger.error("Service search error:", error);
    res.status(500).json({ message: "Server error while searching services" });
  }
};

// ✅ Search sellers
export const searchSellers = async (req, res) => {
  try {
    const query = coerceStr(req.query.query);
    if (!validateQuery(query, res)) return;

    const searchRegex = new RegExp(escapeRegex(query.trim()), "i");
    const sellers = await Seller.find({
      $or: [
        { storeName: searchRegex },
        { businessName: searchRegex },
        { description: searchRegex },
        { name: searchRegex },
      ],
    }).limit(20);

    res.json(sellers);
  } catch (error) {
    logger.error("Seller search error:", error);
    res.status(500).json({ message: "Server error while searching sellers" });
  }
};

// ✅ Optional: Combined site-wide search
export const siteSearch = async (req, res) => {
  try {
    const query = coerceStr(req.query.query);
    if (!validateQuery(query, res)) return;

    const searchRegex = new RegExp(escapeRegex(query.trim()), "i");

    const [products, listings, services, sellers] = await Promise.all([
      Product.find({ name: searchRegex }).limit(10),
      Listing.find({ $or: [{ name: searchRegex }, { description: searchRegex }, { location: searchRegex }] })
        .select("name type images location price rate beds baths distance available amenities").limit(10).lean(),
      Service.find({ $or: [{ title: searchRegex }, { name: searchRegex }, { major: searchRegex }] })
        .select("title name images major desc rate rating provider available").limit(10).lean(),
      Seller.find({
        $or: [
          { storeName: searchRegex },
          { businessName: searchRegex },
          { description: searchRegex },
          { name: searchRegex },
        ],
      }).limit(10),
    ]);

    res.json({ products, listings, services, sellers });
  } catch (error) {
    logger.error("Site search error:", error);
    res.status(500).json({ message: "Server error while searching" });
  }
};

