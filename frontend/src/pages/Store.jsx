import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function getSessionSeed(key) {
  const fresh = () => String((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  try {
    let raw = sessionStorage.getItem(key);
    if (!raw) { raw = fresh(); sessionStorage.setItem(key, raw); }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      raw = fresh();
      sessionStorage.setItem(key, raw);
      return parseInt(raw, 10);
    }
    return parsed;
  } catch {
    return parseInt(fresh(), 10); // private-browsing or quota exceeded
  }
}

function lcgShuffle(arr, seed) {
  const result = [...arr];
  let s = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const FILTERS = ["All", "★ 4.5+", "Subscribed", "Tech", "Fashion", "Books"];

const CAT_KEYWORDS = {
  "Tech":    ["tech", "electronics", "technology", "gadget", "computer", "phone"],
  "Fashion": ["fashion", "clothing", "clothes", "apparel", "wear"],
  "Books":   ["books", "education", "textbook", "stationery", "study"],
};

function applyFilter(sellers, filter) {
  if (filter === "All") return sellers;
  if (filter === "★ 4.5+") return sellers.filter((s) => (s.rating || 0) >= 4.5);
  if (filter === "Subscribed") return sellers.filter((s) => s.isSubscribed === true);
  const keywords = CAT_KEYWORDS[filter];
  if (keywords) {
    return sellers.filter((s) =>
      (s.category || []).some((c) =>
        keywords.some((kw) => c.toLowerCase().includes(kw))
      )
    );
  }
  return sellers;
}

const SORTS = [
  { value: "default", label: "Default" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
  { value: "sales", label: "Most Sales" },
];

function applySort(sellers, sort) {
  if (sort === "rating") return [...sellers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === "newest") return [...sellers].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (sort === "sales") return [...sellers].sort((a, b) => (b.totalOrders || b.salesCount || 0) - (a.totalOrders || a.salesCount || 0));
  return sellers;
}

export default function Store() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("default");
  const [search, setSearch] = useState("");
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/sellers")
      .then((d) => {
        const list = Array.isArray(d?.sellers) ? d.sellers : Array.isArray(d) ? d : [];
        setSellers(lcgShuffle(list, getSessionSeed("store-shuffle-seed")));
      })
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = applyFilter(sellers, filter).filter((s) => {
    if (!q) return true;
    return (
      (s.storeName || s.name || "").toLowerCase().includes(q) ||
      (s.category || []).some((c) => c.toLowerCase().includes(q))
    );
  });
  const visible = applySort(filtered, sort);

  return (
    <div className="page">
      <Navbar />
      <div className="page-inner">
        <div style={{ padding: "12px 0 0" }}>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 4px" }}>Stores</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>
            {sellers.length} store{sellers.length !== 1 ? "s" : ""} · all UNILAG students
          </p>
        </div>

        {/* Search + sort row */}
        <div style={{ padding: "12px 0 0", display: "flex", gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <i className="fas fa-magnifying-glass search-icon" />
            <input
              className="input"
              placeholder="Search stores…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "10px 14px 10px 40px", height: 42 }}
            />
          </div>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: 130, height: 42, paddingLeft: 10 }}
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ padding: "12px 0 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <span
              key={f}
              className={`chip${filter === f ? " active" : ""}`}
              style={{ cursor: "pointer", flexShrink: 0 }}
              onClick={() => setFilter(f)}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="grid-2col" style={{ padding: "16px 0 24px" }}>
          {loading
            ? [1, 2, 3, 4].map((i) => <Skel.StoreCard key={i} />)
            : visible.length === 0
            ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <i className="fas fa-shop" />
                  <h3>No stores found</h3>
                  <p>{filter !== "All" ? `No stores match "${filter}"` : "No stores yet — be the first to open one"}</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("/partner")}>Open a store</button>
                </div>
              )
            : visible.map((s, i) => {
                const bannerUrl = s.banner?.url || null;
                const logoUrl   = s.logo?.url || s.avatar?.url || s.user?.avatar?.url || null;
                const catLabel  = Array.isArray(s.category) ? s.category[0] : (s.category || "Seller");

                return (
                  <div
                    key={s._id || i}
                    className="card"
                    style={{ cursor: "pointer", overflow: "hidden" }}
                    onClick={() => navigate(`/store/${s._id}`)}
                  >
                    {/* Banner */}
                    <div style={{ height: 80, overflow: "hidden" }}>
                      {bannerUrl
                        ? <img src={bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--navy-800, #0f172a) 0%, #1e1b4b 100%)" }} />
                      }
                    </div>

                    <div style={{ padding: "0 12px 14px", textAlign: "center", marginTop: -30 }}>
                      {/* Avatar overlapping bottom of banner */}
                      <div style={{ width: 60, height: 60, borderRadius: 16, overflow: "hidden", margin: "0 auto", position: "relative", zIndex: 1, background: "var(--surface)" }}>
                        {logoUrl
                          ? <img src={logoUrl} alt={s.storeName || s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <Ph kind="portrait-3" label={(s.storeName || s.name || "S")[0]} />
                        }
                      </div>
                      {/* Name + subscribed badge */}
                      <div style={{ fontWeight: 700, fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {s.storeName || s.name}
                        {s.isSubscribed && (
                          <i className="fas fa-crown" style={{ color: "#f59e0b", fontSize: "0.9rem" }} title="UMP Subscribed" />
                        )}
                      </div>

                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>{catLabel}</div>

                      {(s.rating || 0) > 0 && (
                        <div className="rating" style={{ justifyContent: "center", marginTop: 4, fontSize: "1.1rem" }}>
                          <i className="fas fa-star star" /> {s.rating}
                          <span className="count">· {s.totalOrders || s.salesCount || 0} sales</span>
                        </div>
                      )}

                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ width: "100%", marginTop: 10 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/store/${s._id}`); }}
                      >
                        Visit
                      </button>
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
