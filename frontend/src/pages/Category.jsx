import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

export default function Category() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/categories/slug/${slug}`)
      .then((cat) => {
        setCategory(cat);
        return apiFetch(`/api/products/category/${cat._id}?sort=${sort}`);
      })
      .then((d) => { setProducts(d.products || d || []); setTotal(d.total || (d.products || d || []).length); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [slug, sort]);

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 2px" }}>
            {category?.name || slug?.replace(/-/g, " ") || "Category"}
          </h1>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.2rem" }}>{total} products</p>
        </div>
      </div>

      {/* sort row */}
      <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "flex-end" }}>
        <select
          style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-1)", border: "none", background: "transparent", cursor: "pointer", outline: "none", fontFamily: "var(--font-sans)" }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low–High</option>
          <option value="price_desc">Price: High–Low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {/* product grid */}
      <div style={{ padding: "14px 16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {loading
          ? [1,2,3,4,5,6].map(i => <Skel.ProductCard key={i} />)
          : products.length === 0
          ? (
              <div style={{ gridColumn: "span 2", textAlign: "center", padding: "60px 0" }}>
                <i className="fas fa-box-open" style={{ fontSize: "3rem", color: "var(--ink-4)", marginBottom: 12 }} />
                <p style={{ color: "var(--ink-2)", fontSize: "1.4rem" }}>No products in this category yet</p>
                <button className="btn btn-ghost" onClick={() => navigate("/market")}>Browse all</button>
              </div>
            )
          : products.map((p) => (
              <ProductCard key={p._id} product={p} variant="always" onAddToCart={() => {}} />
            ))
        }
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
