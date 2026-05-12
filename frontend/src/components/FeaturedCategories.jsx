import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        let data = await apiFetch("/api/categories");
        if (!Array.isArray(data)) data = data.categories || [];
        data = data.sort(() => Math.random() - 0.5).slice(0, 4);
        if (mounted) setCategories(data);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="featured-categories">
      <h2>Featured Product Categories</h2>
      <p>
        Explore our marketplace by category. Find what you love, quickly and
        easily.
      </p>

      <div className="categories-grid" id="categoryContainer">
        {categories.map((cat) => {
          const imgUrl = cat.images?.[0]?.url || cat.image || "";
          return (
          <Link
            key={cat.slug || cat._id}
            to={`/category/${cat.slug}`}
            className="category-card"
          >
            {imgUrl && <img src={imgUrl} alt={cat.name} />}
            <div className="category-overlay">
              <h3>{cat.name}</h3>
              <span>{cat.description || ""}</span>
            </div>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
