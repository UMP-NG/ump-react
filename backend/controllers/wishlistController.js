import Wishlist from "../models/Wishlist.js";

export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({ path: "items",    select: "name price images category rating condition tag" })
      .populate({ path: "listings", select: "name price location type rate images amenities" });
    res.json({ items: wishlist?.items || [], listings: wishlist?.listings || [] });
  } catch (err) {
    console.error("❌ Wishlist fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleListing = async (req, res) => {
  try {
    const userId = req.user._id;
    const { listingId } = req.params;

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [], listings: [listingId] });
      return res.status(200).json({ message: "Added to saved", inWishlist: true });
    }

    const alreadySaved = wishlist.listings.some((l) => l.toString() === listingId);
    if (alreadySaved) {
      wishlist.listings.pull(listingId);
      await wishlist.save();
      return res.status(200).json({ message: "Removed from saved", inWishlist: false });
    }

    wishlist.listings.push(listingId);
    await wishlist.save();
    res.status(200).json({ message: "Added to saved", inWishlist: true });
  } catch (err) {
    console.error("❌ Listing wishlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ assuming you're using auth middleware
    const { productId } = req.params;

    let wishlist = await Wishlist.findOne({ user: userId });

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [productId] });
      return res
        .status(200)
        .json({ message: "Added to wishlist", inWishlist: true });
    }

    // If product is already there, remove it
    if (wishlist.items.includes(productId)) {
      wishlist.items.pull(productId);
      await wishlist.save();
      return res
        .status(200)
        .json({ message: "Removed from wishlist", inWishlist: false });
    }

    // Otherwise, add it
    wishlist.items.push(productId);
    await wishlist.save();

    res.status(200).json({ message: "Added to wishlist", inWishlist: true });
  } catch (err) {
    console.error("❌ Wishlist error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

