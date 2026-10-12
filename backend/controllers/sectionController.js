import mongoose from "mongoose";
import slugify from "slugify";
import Section from "../models/Section.js";
import Product from "../models/Product.js";
import logger from "../utils/logger.js";

// GET /api/sections — public, active sections only (for the seller listing
// form's picker and general reference)
export const listSections = async (req, res) => {
  try {
    const sections = await Section.find({ active: true }).sort({ name: 1 });
    res.json(sections);
  } catch (err) {
    logger.error("listSections", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sections/admin — admin-only, every section (active + retired)
export const listSectionsAdmin = async (req, res) => {
  try {
    const sections = await Section.find().sort({ name: 1 });
    res.json(sections);
  } catch (err) {
    logger.error("listSectionsAdmin", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sections/with-products — public, each active+non-empty section
// with its products populated, for Home page rendering
export const listSectionsWithProducts = async (req, res) => {
  try {
    const sections = await Section.find({ active: true }).sort({ name: 1 }).lean();
    const results = await Promise.all(
      sections.map(async (s) => {
        // isRemoved (admin moderation) isn't covered by the model's
        // soft-delete query hook (that only excludes deletedAt) — exclude it
        // explicitly so a removed product never surfaces on the public Home
        // page. isFlagged is left alone, matching the rest of the public
        // product listing (productController.js), which doesn't hide
        // flagged-but-not-removed products either.
        const products = await Product.find({ sections: s._id, isAvailable: true, isRemoved: { $ne: true } })
          .select("name price images slug salePrice saleEndsAt")
          .limit(12)
          .lean();
        return { ...s, products };
      })
    );
    res.json(results.filter((s) => s.products.length > 0));
  } catch (err) {
    logger.error("listSectionsWithProducts", err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sections/:id/products — admin-only, every product currently
// assigned to this section regardless of active/available/removed status or
// count. Unlike listSectionsWithProducts (which is Home-page display logic:
// active sections only, isAvailable products only, capped at 12), this is
// the admin's "what's actually in this section" management view and must
// never silently hide items the public page's filters would exclude.
export const getSectionProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id).lean();
    if (!section) return res.status(404).json({ message: "Section not found" });
    const products = await Product.find({ sections: id })
      .select("name price images slug isAvailable isRemoved")
      .setOptions({ includeDeleted: true })
      .sort({ name: 1 })
      .lean();
    res.json({ products });
  } catch (err) {
    logger.error("getSectionProducts", err);
    res.status(500).json({ message: err.message });
  }
};

export const createSection = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name required" });

    const slug = slugify(name, { lower: true, strict: true });
    const existing = await Section.findOne({ slug });
    if (existing) return res.status(409).json({ message: "Section already exists" });

    const section = await Section.create({ name: name.trim(), slug, active: true });
    res.status(201).json(section);
  } catch (err) {
    logger.error("createSection", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ message: "Name cannot be empty" });
      const slug = slugify(name, { lower: true, strict: true });
      const collision = await Section.findOne({ slug, _id: { $ne: id } }).select("_id").lean();
      if (collision) return res.status(409).json({ message: "Another section already has this name" });
      updates.name = name;
      updates.slug = slug;
    }
    if (req.body.active !== undefined) updates.active = !!req.body.active;

    const section = await Section.findByIdAndUpdate(id, updates, { new: true });
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json(section);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Another section already has this name" });
    }
    logger.error("updateSection", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteSection = async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  try {
    let deleted = null;
    await session.withTransaction(async () => {
      deleted = await Section.findByIdAndDelete(id, { session });
      if (!deleted) return; // nothing to clean up — handled after the transaction
      await Product.updateMany({ sections: id }, { $pull: { sections: id } }, { session });
    });
    if (!deleted) return res.status(404).json({ message: "Section not found" });
    res.json({ message: "Section deleted" });
  } catch (err) {
    logger.error("deleteSection", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// PUT /api/sections/:id/products — bulk-assign a set of product ids to a
// section (used by the admin Sections manager's per-section product picker)
export const addProductsToSection = async (req, res) => {
  const { id } = req.params;
  const { productIds } = req.body;
  if (!Array.isArray(productIds) || !productIds.length) {
    return res.status(400).json({ message: "productIds array required" });
  }
  const validProductIds = productIds.filter((pid) => mongoose.Types.ObjectId.isValid(pid));
  if (!validProductIds.length) {
    return res.status(400).json({ message: "No valid product ids provided" });
  }

  // Same transactional pattern as deleteSection — the existence check and the
  // assignment happen as one atomic unit, so a concurrent deleteSection can
  // never interleave between "section confirmed to exist" and "products
  // updated" and leave a dangling reference to a section that no longer exists.
  const session = await mongoose.startSession();
  try {
    let section = null;
    await session.withTransaction(async () => {
      section = await Section.findById(id).session(session);
      if (!section) return;
      await Product.updateMany({ _id: { $in: validProductIds } }, { $addToSet: { sections: section._id } }, { session });
    });
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json({ message: "Products added to section" });
  } catch (err) {
    logger.error("addProductsToSection", err);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

export const removeProductFromSection = async (req, res) => {
  try {
    const { id, productId } = req.params;
    await Product.findByIdAndUpdate(productId, { $pull: { sections: id } });
    res.json({ message: "Product removed from section" });
  } catch (err) {
    logger.error("removeProductFromSection", err);
    res.status(500).json({ message: err.message });
  }
};
