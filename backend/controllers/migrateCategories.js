import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Subcategory from "../models/Subcategory.js";
import slugify from "slugify";

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const products = await Product.find();

  for (const p of products) {
    if (!p.category || typeof p.category === "object") continue;
    const catName = p.category.trim();
    const slug = slugify(catName, { lower: true, strict: true });

    let cat = await Category.findOne({ slug });
    if (!cat) cat = await Category.create({ name: catName, slug });

    // optionally handle subcategory if you have product.subcategoryString
    if (p.subcategoryString) {
      const subName = p.subcategoryString.trim();
      let sub = await Subcategory.findOne({
        parent: cat._id,
        slug: slugify(subName, { lower: true, strict: true }),
      });
      if (!sub)
        sub = await Subcategory.create({
          name: subName,
          slug: slugify(subName, { lower: true, strict: true }),
          parent: cat._id,
        });
      p.subcategory = sub._id;
    }

    p.category = cat._id;
    await p.save();
  }
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
