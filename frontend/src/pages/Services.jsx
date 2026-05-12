import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const CATS = ["All", "Tutoring", "Design", "Fitness", "Music", "Photo", "Coding"];
const SORTS = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low" },
  { value: "price-desc", label: "Price: High" },
  { value: "rating", label: "Top Rated" },
];

function matchesCat(service, cat) {
  if (cat === "All") return true;
  const fields = [
    service.category,
    service.type,
    service.title,
    service.name,
    service.major,
    service.description,
  ].filter(Boolean).join(" ").toLowerCase();
  return fields.includes(cat.toLowerCase());
}

function applySort(services, sort) {
  if (sort === "price-asc") return [...services].sort((a, b) => (a.rate || 0) - (b.rate || 0));
  if (sort === "price-desc") return [...services].sort((a, b) => (b.rate || 0) - (a.rate || 0));
  if (sort === "rating") return [...services].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return services;
}

export default function Services() {
  const navigate = useNavigate();
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("default");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/services")
      .then((d) => setServices(d.services || d || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = applySort(
    services.filter((s) => {
      if (!matchesCat(s, cat)) return false;
      if (availableOnly && s.available === false) return false;
      if (maxPrice && (s.rate || 0) > Number(maxPrice)) return false;
      return true;
    }),
    sort
  );

  return (
    <div className="page">
      <Navbar />
      <div className="page-inner">
        <div style={{ padding: "12px 0 0" }}>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 4px" }}>Services</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>Hire talent right on campus.</p>
        </div>

        {/* Filter row */}
        <div style={{ padding: "12px 0 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {CATS.map((c) => (
            <span
              key={c}
              className={`chip${cat === c ? " active" : ""}`}
              style={{ cursor: "pointer", flexShrink: 0 }}
              onClick={() => setCat(c)}
            >
              {c}
            </span>
          ))}
        </div>

        {/* Sort + price + availability row */}
        <div style={{ padding: "10px 0 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: 130, height: 40, paddingLeft: 10, flexShrink: 0 }}
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input
            className="input"
            type="number"
            placeholder="Max price (₦)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: 140, height: 40, flexShrink: 0 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.3rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            Available only
          </label>
        </div>

        <div style={{ padding: "14px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading
            ? [1, 2, 3].map((i) => <Skel.ServiceCard key={i} />)
            : visible.length === 0
            ? (
                <div className="empty-state">
                  <i className="fas fa-hand-holding-heart" />
                  <h3>No services found</h3>
                  <p>{cat !== "All" ? `No "${cat}" services match your filters` : "No services listed yet — check back soon"}</p>
                </div>
              )
            : visible.map((s) => {
                const imgUrl = s.images?.[0]?.url || null;
                const providerName = s.provider?.storeName || s.provider?.businessName || s.provider?.brandName || s.provider?.name || "Provider";

                return (
                  <div
                    key={s._id}
                    className="card"
                    style={{ padding: 14, display: "flex", gap: 12, cursor: "pointer" }}
                    onClick={() => navigate(`/services/${s._id}`)}
                  >
                    <div style={{ width: 96, height: 96, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                      {imgUrl
                        ? <img src={imgUrl} alt={s.title || s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Ph kind={s.category?.toLowerCase() || s.major?.toLowerCase() || "default"} label={s.category || s.major || ""} />
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.3 }}>{s.title || s.name}</div>
                        {s.available === false && (
                          <span style={{ fontSize: "1rem", padding: "2px 7px", borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 600, flexShrink: 0 }}>Unavailable</span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 4 }}>
                        {providerName}
                        {s.verified && <i className="fas fa-circle-check" style={{ color: "var(--accent)", fontSize: "1rem" }} />}
                      </div>

                      {(s.rating || 0) > 0 && (
                        <div className="rating" style={{ marginTop: 4 }}>
                          <i className="fas fa-star star" /> {s.rating}
                          <span className="count">({s.reviewsCount || 0})</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>
                          {naira(s.rate || 0)}<span style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 500 }}>/session</span>
                        </span>
                        <button
                          className="btn btn-sm btn-dark"
                          onClick={(e) => { e.stopPropagation(); navigate(`/services/${s._id}`); }}
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
