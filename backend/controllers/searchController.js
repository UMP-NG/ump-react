import Product from "../models/Product.js";
import Listing from "../models/Listing.js";
import Service from "../models/Service.js";
import Seller from "../models/Seller.js";

// ✅ Search products
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "Please provide a search query" });

    const searchRegex = new RegExp(query, "i");
    const products = await Product.find({ name: searchRegex }).limit(20);

    res.json(products);
  } catch (error) {
    console.error("Product search error:", error);
    res.status(500).json({ message: "Server error while searching products" });
  }
};

// ✅ Search listings
export const searchListings = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "Please provide a search query" });

    const searchRegex = new RegExp(query, "i");
    const listings = await Listing.find({ title: searchRegex }).limit(20);

    res.json(listings);
  } catch (error) {
    console.error("Listing search error:", error);
    res.status(500).json({ message: "Server error while searching listings" });
  }
};

// ✅ Search services
export const searchServices = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "Please provide a search query" });

    const searchRegex = new RegExp(query, "i");
    const services = await Service.find({ title: searchRegex }).limit(20);

    res.json(services);
  } catch (error) {
    console.error("Service search error:", error);
    res.status(500).json({ message: "Server error while searching services" });
  }
};

// ✅ Search sellers
export const searchSellers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "Please provide a search query" });

    const searchRegex = new RegExp(query, "i");
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
    console.error("Seller search error:", error);
    res.status(500).json({ message: "Server error while searching sellers" });
  }
};

// ✅ Optional: Combined site-wide search
export const siteSearch = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "Please provide a search query" });

    const searchRegex = new RegExp(query, "i");

    const [products, listings, services, sellers] = await Promise.all([
      Product.find({ name: searchRegex }).limit(10),
      Listing.find({ title: searchRegex }).limit(10),
      Service.find({ title: searchRegex }).limit(10),
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
    console.error("Site search error:", error);
    res.status(500).json({ message: "Server error while searching" });
  }
};
