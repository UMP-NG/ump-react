import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const CATS = ["All", "Design", "Writing", "Tech / Coding", "Tutoring", "Photography", "Fitness", "Music", "Other"];

export default function Providers() {
  const navigate   = useNavigate();
  const [cat, setCat]         = useState("All");
  const [search, setSearch]   = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/services/providers")
      .then((d) => setProviders(d.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = providers.filter((p) => {
    if (cat !== "All" && !p.categories?.some((c) => c?.toLowerCase() === cat.toLowerCase())) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.businessName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.headline?.toLowerCase().includes(q) ||
        p.categories?.some((c) => c?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="page">
      <Navbar />
      <div className="page-inner">

        {/* Header */}
        <div style={{ padding: "12px 0 0" }}>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 4px" }}>Service Providers</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>Browse talent and freelancers right on campus.</p>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 0 0" }}>
          <div style={{ position: "relative" }}>
            <i className="fas fa-magnifying-glass" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", fontSize: "1.2rem" }} />
            <input
              className="input"
              placeholder="Search by name, skill, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        {/* Category chips */}
        <div style={{ padding: "10px 0 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
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

        {/* Grid */}
        <div style={{ padding: "14px 0 32px" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="card" style={{ padding: 14 }}>
                  <Skel w={56} h={56} r="50%" style={{ margin: "0 auto 10px" }} />
                  <Skel w="70%" h={14} r={6} style={{ margin: "0 auto 6px" }} />
                  <Skel w="50%" h={12} r={4} style={{ margin: "0 auto" }} />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-slash" />
              <h3>No providers found</h3>
              <p>{search || cat !== "All" ? "Try a different search or category" : "No service providers yet — check back soon"}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {visible.map((p) => {
                const avatarUrl = p.avatar?.url || (typeof p.avatar === "string" ? p.avatar : null);
                const displayName = p.businessName || p.name || "Provider";
                return (
                  <div
                    key={p._id}
                    className="card"
                    style={{ padding: 16, cursor: "pointer", textAlign: "center" }}
                    onClick={() => navigate(`/providers/${p._id}`)}
                  >
                    {/* Avatar */}
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

                    {/* Name */}
                    <div style={{ fontSize: "1.35rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>

                    {/* Headline */}
                    {p.headline && (
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.headline}</div>
                    )}

                    {/* Categories */}
                    {p.categories?.length > 0 && (
                      <div style={{ fontSize: "1.1rem", color: "var(--accent)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.categories.slice(0, 2).join(" · ")}
                      </div>
                    )}

                    {/* Stats row */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 10, fontSize: "1.15rem", color: "var(--ink-3)" }}>
                      <span><i className="fas fa-briefcase" style={{ marginRight: 3 }} />{p.serviceCount}</span>
                      {p.avgRating > 0 && (
                        <span><i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 3 }} />{p.avgRating}</span>
                      )}
                    </div>

                    {/* Location */}
                    {p.location && (
                      <div style={{ fontSize: "1.05rem", color: "var(--ink-4)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <i className="fas fa-location-dot" style={{ marginRight: 3 }} />{p.location}
                      </div>
                    )}
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
