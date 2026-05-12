import express from "express";
import {
  searchProducts,
  searchListings,
  searchServices,
  searchSellers,
  siteSearch,
} from "../controllers/searchController.js";

const router = express.Router();

// 🔎 Individual search endpoints
router.get("/products", searchProducts);
router.get("/listings", searchListings);
router.get("/services", searchServices);
router.get("/sellers", searchSellers);

// 🌍 Optional combined site-wide search
router.get("/", siteSearch);

export default router;

