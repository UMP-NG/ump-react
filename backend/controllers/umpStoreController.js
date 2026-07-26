import crypto from "crypto";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Product from "../models/Product.js";
import logger from "../utils/logger.js";

const OFFICIAL_STORE_EMAIL = "official-store@ump.internal";

// Lazily creates the dedicated system account + Seller profile backing the official
// UMP Store the first time any admin opens the UMP Store page. Idempotent — a second
// call just returns the existing Seller doc. This account is never used to log in;
// admins manage its products entirely through the existing admin product endpoints.
async function getOrCreateOfficialSeller() {
  let seller = await Seller.findOne({ isOfficial: true });
  if (seller) return seller;

  let systemUser = await User.findOne({ email: OFFICIAL_STORE_EMAIL });
  if (!systemUser) {
    systemUser = await User.create({
      name: "UMP Store",
      email: OFFICIAL_STORE_EMAIL,
      password: crypto.randomBytes(32).toString("hex"),
      roles: ["seller"],
      isVerified: true,
      identityVerified: true,
    });
  }

  seller = await Seller.create({
    user: systemUser._id,
    name: "UMP Store",
    storeName: "UMP Store",
    businessName: "UMP Store",
    bio: "The official UMP store — verified merch and campus picks.",
    description: "Official UMP-run store for verified products and merch.",
    isOfficial: true,
    isOpen: true,
  });
  return seller;
}

export const getUmpStore = async (req, res) => {
  try {
    const seller = await getOrCreateOfficialSeller();
    const products = await Product.find({ seller: seller.user })
      .sort({ createdAt: -1 })
      .populate("category", "name")
      .lean();
    res.json({ seller, products });
  } catch (err) {
    logger.error("getUmpStore:", err);
    res.status(500).json({ message: "Server error" });
  }
};
