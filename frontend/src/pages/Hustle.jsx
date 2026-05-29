import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import Skel from "../components/Skel";
import { apiFetch } from "../utils/api";

/** Extracts a URL from either {url, publicId} objects or plain URL strings. */
function getImgUrl(obj) {
  return obj?.url || (typeof obj === "string" ? obj : null);
}

const STORE_FILTERS   = ["All", "★ 4.5+", "Subscribed", "Tech", "Fashion", "Books"];
const PROVIDER_CATS   = ["All", "Design", "Writing", "Tech / Coding", "Tutoring", "Photography", "Fitness", "Music", "Other"];

const CAT_KEYWORDS = {
  "Tech":    ["tech", "electronics", "technology", "gadget", "computer", "phone"],
  "Fashion": ["fashion", "clothing", "clothes", "apparel", "wear"],
  "Books":   ["books", "education", "textbook", "stationery", "study"],
};

function applyStoreFilter(sellers, filter) {
  if (filter === "All") return sellers;
  if (filter === "★ 4.5+") return sellers.filter((s) => (s.rating || 0) >= 4.5);
  if (filter === "Subscribed") return sellers.filter((s) => s.isSubscribed === true);
  const keywords = CAT_KEYWORDS[filter];
  if (keywords) return sellers.filter((s) => (s.category || []).some((c) => keywords.some((kw) => c.toLowerCase().includes(kw))));
  return sellers;
}

export default function Hustle() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initTab = searchParams.get("tab") === "providers" ? "providers" : "stores";
  const [tab, setTab] = useState(initTab);
  const [search, setSearch] = useState("");

  function switchTab(t) {
    setTab(t);
    setSearchParams(t === "stores" ? {} : { tab: t });
    setSearch("");
  }

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "14px 16px 0" }}>
        <h1 style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 2px" }}>
          <span style={{ color: "var(--accent)" }}>The</span> Hustle
        </h1>
        <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>Campus stores &amp; service providers in one place.</p>

        {/* Search */}
        <div style={{ position: "relative", margin: "12px 0 10px" }}>
          <i className="fas fa-magnifying-glass" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", fontSize: "1.3rem", pointerEvents: "none" }} />
          <input
            className="input"
            style={{ paddingLeft: 40, height: 44 }}
            placeholder={tab === "stores" ? "Search stores…" : "Search providers…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: "1.3rem", padding: 2 }}>
              <i className="fas fa-xmark" />
            </button>
          )}
        </div>

        {/* Tab pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 0 }}>
          {[
            { id: "stores",    label: "Stores",    icon: "store" },
            { id: "providers", label: "Providers", icon: "people-group" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: "var(--r-pill)", border: "none",
                background: tab === t.id ? "var(--accent)" : "var(--surface)",
                color: tab === t.id ? "#fff" : "var(--ink-2)",
                fontWeight: 700, fontSize: "1.25rem", cursor: "pointer",
                fontFamily: "var(--font-sans)", transition: "all .15s",
              }}
            >
              <i className={`fas fa-${t.icon}`} style={{ fontSize: "1.1rem" }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "stores"    && <StoresTab    search={search} navigate={navigate} />}
      {tab === "providers" && <ProvidersTab search={search} navigate={navigate} />}

      <Footer />
      <BottomNav />
    </div>
  );
}

/* ─── Stores Tab ───────────────────────────────────────────────────── */
function StoresTab({ search, navigate }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");

  useEffect(() => {
    apiFetch("/api/sellers")
      .then(d => setSellers(d.sellers || d || []))
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = applyStoreFilter(sellers, filter).filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.storeName || "").toLowerCase().includes(q) ||
      (s.businessName || "").toLowerCase().includes(q) ||
      (s.description || s.bio || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "10px 16px 100px" }}>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: "10px 0 12px" }}>
        {STORE_FILTERS.map(f => (
          <span key={f} className={`chip${filter === f ? " active" : ""}`} style={{ flexShrink: 0, cursor: "pointer" }} onClick={() => setFilter(f)}>{f}</span>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(156px,1fr))", gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card" style={{ padding: 14 }}><Skel w={56} h={56} r="50%" style={{ margin: "0 auto 10px" }} /><Skel w="70%" h={14} r={6} style={{ margin: "0 auto 6px" }} /><Skel w="50%" h={12} r={4} style={{ margin: "0 auto" }} /></div>)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-store" />
          <h3>No stores found</h3>
          <p>{search ? `No stores matching "${search}"` : "No stores match your filter."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(156px,1fr))", gap: 14 }}>
          {visible.map(s => {
            const logoUrl   = getImgUrl(s.logo) || getImgUrl(s.avatar);
            const bannerUrl = getImgUrl(s.banner);
            const name = s.storeName || s.businessName || s.name || "Store";
            return (
              <div key={s._id} className="card" style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/store/${s._id}`)}>
                {/* Banner */}
                <div style={{ height: 70, background: "var(--surface)", position: "relative" }}>
                  {bannerUrl
                    ? <img src={bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,var(--accent),#ea580c)" }} />}
                  {/* Logo overlay */}
                  <div style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "3px solid var(--white)", background: "var(--surface)" }}>
                    {logoUrl
                      ? <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Ph kind="portrait-3" label={name[0]} />}
                  </div>
                </div>
                <div style={{ padding: "26px 12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  {s.isSubscribed && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "1rem", color: "#f59e0b", marginTop: 3 }}>
                      <i className="fas fa-crown" style={{ fontSize: "0.85rem" }} /> Subscribed
                    </div>
                  )}
                  {(s.rating || 0) > 0 && (
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>
                      <i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 3 }} />{s.rating}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Providers Tab ────────────────────────────────────────────────── */
function ProvidersTab({ search, navigate }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [cat, setCat]             = useState("All");

  useEffect(() => {
    apiFetch("/api/services/providers")
      .then(d => setProviders(d.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = providers.filter(p => {
    if (cat !== "All" && !p.categories?.some(c => c?.toLowerCase() === cat.toLowerCase())) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (p.businessName || p.name || "").toLowerCase().includes(q) ||
        (p.headline || "").toLowerCase().includes(q) ||
        (p.categories || []).some(c => c?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ padding: "10px 16px 100px" }}>
      {/* Category chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: "10px 0 12px" }}>
        {PROVIDER_CATS.map(c => (
          <span key={c} className={`chip${cat === c ? " active" : ""}`} style={{ flexShrink: 0, cursor: "pointer" }} onClick={() => setCat(c)}>{c}</span>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(156px,1fr))", gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card" style={{ padding: 14 }}><Skel w={56} h={56} r="50%" style={{ margin: "0 auto 10px" }} /><Skel w="70%" h={14} r={6} style={{ margin: "0 auto 6px" }} /><Skel w="50%" h={12} r={4} style={{ margin: "0 auto" }} /></div>)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-user-slash" />
          <h3>No providers found</h3>
          <p>{search || cat !== "All" ? "Try a different search or category." : "No service providers yet."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(156px,1fr))", gap: 14 }}>
          {visible.map(p => {
            const avatarUrl   = getImgUrl(p.avatar);
            const displayName = p.businessName || p.name || "Provider";
            return (
              <div key={p._id} className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center" }} onClick={() => navigate(`/providers/${p._id}`)}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", margin: "0 auto 10px", background: "var(--surface)", position: "relative" }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Ph kind="portrait-3" label={displayName[0]} />}
                  {p.verified && (
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#f59e0b", border: "2px solid var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="fas fa-crown" style={{ fontSize: "0.65rem", color: "#fff" }} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                {p.headline && <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.headline}</div>}
                {p.categories?.length > 0 && (
                  <div style={{ fontSize: "1.1rem", color: "var(--accent)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.categories.slice(0, 2).join(" · ")}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8, fontSize: "1.15rem", color: "var(--ink-3)" }}>
                  <span><i className="fas fa-briefcase" style={{ marginRight: 3 }} />{p.serviceCount || 0}</span>
                  {p.avgRating > 0 && <span><i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 3 }} />{p.avgRating}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
