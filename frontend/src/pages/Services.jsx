import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
const PRICE_SUFFIX = { hourly: "/hr", per_project: "/project", starting_from: " from", fixed: "" };
function fmtPrice(s) {
  if (s.pricingType === "negotiable") return { label: "Negotiable", accent: false };
  if (s.pricingType === "free")       return { label: "Free",       accent: false };
  const cur = s.currency === "USD" ? "$" : "₦";
  return { label: `${cur}${Number(s.rate || 0).toLocaleString()}${PRICE_SUFFIX[s.pricingType] || ""}`, accent: true };
}
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";
import { cloudImg } from "../utils/cloudinary";

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
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              width: 140, height: 40, flexShrink: 0,
              padding: "0 32px 0 12px",
              border: "1px solid var(--line-strong)", borderRadius: "var(--r-md)",
              background: "var(--white)", color: "var(--ink-1)",
              fontSize: "1.4rem", fontFamily: "var(--font-sans)",
              appearance: "none", WebkitAppearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
              cursor: "pointer", outline: "none",
            }}
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

        <div style={{ padding: "14px 0 24px" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {[1,2,3,4].map((i) => <Skel.ServiceCard key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-hand-holding-heart" />
              <h3>No services found</h3>
              <p>{cat !== "All" ? `No "${cat}" services match your filters` : "No services listed yet — check back soon"}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {visible.map((s) => {
                const imgUrl = cloudImg(s.images?.[0]?.url || null, { w: 400 });
                const providerName = s.provider?.serviceProviderInfo?.businessName || s.provider?.storeName || s.provider?.businessName || s.provider?.name || "Provider";
                const price = fmtPrice(s);

                return (
                  <div
                    key={s._id}
                    className="card"
                    style={{ overflow: "hidden", cursor: "pointer" }}
                    onClick={() => navigate(`/services/${s._id}`)}
                  >
                    {/* Cover image */}
                    <div style={{ height: 140, background: "var(--surface)", position: "relative" }}>
                      {imgUrl
                        ? <img src={imgUrl} alt={s.title || s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Ph kind={s.major?.toLowerCase() || "default"} label={s.major || ""} />}
                      {s.available === false && (
                        <span style={{ position: "absolute", top: 6, left: 6, fontSize: "0.9rem", padding: "2px 7px", borderRadius: 8, background: "rgba(220,38,38,.9)", color: "#fff", fontWeight: 700 }}>Unavailable</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "10px 12px 12px" }}>
                      {s.major && (
                        <div style={{ fontSize: "1.05rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{s.major}</div>
                      )}
                      <div style={{ fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.3, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {s.title || s.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "1.15rem", color: "var(--ink-3)", marginBottom: 6 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{providerName}</span>
                        {s.verified && <i className="fas fa-crown" style={{ color: "#f59e0b", fontSize: "0.9rem", flexShrink: 0 }} />}
                      </div>
                      {(s.rating || 0) > 0 && (
                        <div className="rating" style={{ fontSize: "1.1rem", marginBottom: 6 }}>
                          <i className="fas fa-star star" /> {s.rating}
                          <span className="count">({s.reviewsCount || 0})</span>
                        </div>
                      )}
                      <div style={{ fontSize: "1.55rem", fontWeight: 800, color: price.accent ? "var(--accent)" : "var(--ink-1)" }}>
                        {price.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
