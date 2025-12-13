import React, { useEffect, useState } from "react";
import { API_BASE } from "../utils/api";

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        let data = await res.json();
        data = data.sort(() => Math.random() - 0.5).slice(0, 4);
        if (mounted) setCategories(data);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="featured-categories">
      <h2>Featured Product Categories</h2>
      <p>
        Explore our marketplace by category. Find what you love, quickly and
        easily.
      </p>

      <div className="categories-grid" id="categoryContainer">
        {categories.map((cat) => (
          <a
            key={cat.slug}
            href={`/pages/category.html?slug=${cat.slug}`}
            className="category-card"
          >
            <img src={cat.image} alt={cat.name} />
            <div className="category-overlay">
              <h3>{cat.name}</h3>
              <span>{cat.description || ""}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
