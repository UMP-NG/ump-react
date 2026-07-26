import crypto from "crypto";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Product from "../models/Product.js";
import logger from "../utils/logger.js";

const OFFICIAL_STORE_EMAIL = "official-store@ump.internal";

// Creates the dedicated system account + Seller profile backing the official UMP
// Store if it doesn't already exist. Idempotent — a second call just returns the
// existing Seller doc. Called once at server startup (see server.js) so the store
// shows up on /store immediately, without depending on an admin first opening the
// admin UMP Store page. This account is never used to log in; admins manage its
// products entirely through the existing admin product endpoints.
export async function getOrCreateOfficialSeller() {
  let seller = await Seller.findOne({ isOfficial: true });
  if (seller) return seller;

  let systemUser;
  try {
    systemUser = await User.create({
      name: "UMP Store",
      email: OFFICIAL_STORE_EMAIL,
      password: crypto.randomBytes(32).toString("hex"),
      roles: ["seller"],
      isVerified: true,
      identityVerified: true,
    });
  } catch (err) {
    // Two admins opening the page at the same time can race here — the unique
    // email index rejects the second create, so just fetch the one that won.
    if (err.code === 11000) systemUser = await User.findOne({ email: OFFICIAL_STORE_EMAIL });
    else throw err;
  }

  try {
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
  } catch (err) {
    // Same race, but on the Seller side (partial unique index on isOfficial:true,
    // or the per-user unique index) — whichever request lost just reads the winner.
    if (err.code === 11000) seller = await Seller.findOne({ isOfficial: true });
    else throw err;
  }
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

// Admins can update the official store's logo/banner (via handleSellerUpload,
// the same Cloudinary upload middleware normal sellers use) and basic profile
// text — any admin, no ownership check, matching every other admin route.
export const updateUmpStore = async (req, res) => {
  try {
    const seller = await getOrCreateOfficialSeller();

    const { storeName, bio, description } = req.body;
    if (storeName?.trim()) seller.storeName = storeName.trim();
    if (bio?.trim()) seller.bio = bio.trim();
    if (description?.trim()) seller.description = description.trim();

    const logoFile = req.files?.logo?.[0];
    const bannerFile = req.files?.banner?.[0];
    if (logoFile) seller.logo = { url: logoFile.path, publicId: logoFile.filename };
    if (bannerFile) seller.banner = { url: bannerFile.path, publicId: bannerFile.filename };

    await seller.save();
    res.json({ success: true, seller });
  } catch (err) {
    logger.error("updateUmpStore:", err);
    res.status(500).json({ message: "Server error" });
  }
};
