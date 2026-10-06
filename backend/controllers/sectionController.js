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
        const products = await Product.find({ sections: s._id, isAvailable: true })
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
      updates.name = req.body.name.trim();
      updates.slug = slugify(updates.name, { lower: true, strict: true });
    }
    if (req.body.active !== undefined) updates.active = !!req.body.active;

    const section = await Section.findByIdAndUpdate(id, updates, { new: true });
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json(section);
  } catch (err) {
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
