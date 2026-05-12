import Category from "../models/Category.js";
import Subcategory from "../models/Subcategory.js";
import slugify from "slugify";

/**
 * Category controllers:
 * - createCategory
 * - listCategories
 * - getCategory (with subcategories)
 * - updateCategory
 * - deleteCategory
 *
 * Subcategory controllers:
 * - createSubcategory
 * - listSubcategories (optionally by parent)
 * - updateSubcategory
 * - deleteSubcategory
 */

export const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const slug = slugify(name, { lower: true, strict: true });
    const existing = await Category.findOne({ slug });
    if (existing) return res.status(409).json({ message: "Category exists" });

    const cat = await Category.create({ name, slug, description, image });
    res.status(201).json(cat);
  } catch (err) {
    console.error("createCategory", err);
    res.status(500).json({ message: err.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ name: 1 })
      .populate("subcategories");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await Category.findById(id).populate("subcategories");
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.name)
      updates.slug = slugify(updates.name, { lower: true, strict: true });
    const cat = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // Optional: prevent delete if subcategories exist / products exist
    const subCount = await Subcategory.countDocuments({ parent: id });
    if (subCount > 0)
      return res.status(400).json({ message: "Delete subcategories first" });

    await Category.findByIdAndDelete(id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* Subcategory controllers */

export const createSubcategory = async (req, res) => {
  try {
    const { name, parent, description, image } = req.body;
    if (!name || !parent)
      return res.status(400).json({ message: "Name and parent required" });
    const slug = slugify(name, { lower: true, strict: true });
    const existing = await Subcategory.findOne({ parent, slug });
    if (existing)
      return res
        .status(409)
        .json({ message: "Subcategory exists for this category" });

    const sub = await Subcategory.create({
      name,
      slug,
      parent,
      description,
      image,
    });

    // push to category.subcategories (optional)
    await Category.findByIdAndUpdate(parent, {
      $addToSet: { subcategories: sub._id },
    });

    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listSubcategories = async (req, res) => {
  try {
    const { parent } = req.query;

    let query = {};
    if (parent) query = { parent };

    const subs = await Subcategory.find(query).sort({ name: 1 });

    res.json(subs);
  } catch (err) {
    console.error("❌ listSubcategories error:", err);
    res.status(500).json({ message: "Failed to load subcategories" });
  }
};

export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.name)
      updates.slug = slugify(updates.name, { lower: true, strict: true });
    const sub = await Subcategory.findByIdAndUpdate(id, updates, { new: true });
    if (!sub) return res.status(404).json({ message: "Subcategory not found" });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    // optional: prevent delete if products assigned
    await Category.updateOne(
      { subcategories: id },
      { $pull: { subcategories: id } }
    );
    await Subcategory.findByIdAndDelete(id);
    res.json({ message: "Subcategory deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

