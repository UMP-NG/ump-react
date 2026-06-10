import Coupon from "../models/Coupon.js";
import logger from "../utils/logger.js";

// POST /api/coupons/apply — validate and return discount info (buyer)
export const applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code is required" });
    const amount = Number(orderAmount);
    if (!amount || amount <= 0) return res.status(400).json({ message: "A valid order amount is required" });

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), active: true });
    if (!coupon) return res.status(404).json({ message: "Invalid or expired coupon code" });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ message: "This coupon has expired" });
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: "This coupon has reached its usage limit" });
    if (amount < (coupon.minOrderAmount || 0)) return res.status(400).json({ message: `Minimum order amount for this coupon is ₦${coupon.minOrderAmount.toLocaleString("en-NG")}` });

    const discount = coupon.discountType === "percent"
      ? Math.min((Math.min(coupon.discountValue, 100) / 100) * amount, amount)
      : Math.min(coupon.discountValue, amount);

    res.json({ valid: true, discount: Math.round(discount), couponId: coupon._id, discountType: coupon.discountType, discountValue: coupon.discountValue });
  } catch (err) {
    logger.error("applyCoupon:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/coupons — admin: list all coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/coupons — admin: create coupon
export const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    if (!code || !discountType || !discountValue) return res.status(400).json({ message: "code, discountType and discountValue are required" });
    const coupon = await Coupon.create({ code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, createdBy: req.user._id });
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Coupon code already exists" });
    logger.error("createCoupon:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/coupons/:id — admin: update coupon
export const updateCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, active } = req.body;
    const updates = {};
    if (code !== undefined)            updates.code = String(code).trim().toUpperCase();
    if (discountType !== undefined)    updates.discountType = discountType;
    if (discountValue !== undefined)   updates.discountValue = Number(discountValue);
    if (minOrderAmount !== undefined)  updates.minOrderAmount = Number(minOrderAmount) || 0;
    if (maxUses !== undefined)         updates.maxUses = maxUses ? Number(maxUses) : null;
    if (expiresAt !== undefined)       updates.expiresAt = expiresAt || null;
    if (active !== undefined)          updates.active = Boolean(active);

    // Mongoose's custom validator uses `this.discountType` which is undefined during
    // partial updates via findByIdAndUpdate. Enforce the percent cap at the controller level.
    if (updates.discountValue !== undefined) {
      const effectiveType = updates.discountType ?? (await Coupon.findById(req.params.id).select("discountType").lean())?.discountType;
      if (effectiveType === "percent" && updates.discountValue > 100) {
        return res.status(400).json({ message: "Percent discount cannot exceed 100%" });
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ success: true, coupon });
  } catch (err) {
    logger.error("updateCoupon:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/coupons/:id — admin: delete coupon
export const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
