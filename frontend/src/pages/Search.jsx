import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const TABS = ["All", "Products", "Services", "Stores", "Hostels"];

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    Promise.allSettled([
      apiFetch(`/api/products?search=${encodeURIComponent(q)}&limit=12`),
      apiFetch(`/api/services?search=${encodeURIComponent(q)}&limit=8`),
      apiFetch(`/api/sellers?search=${encodeURIComponent(q)}&limit=8`),
      apiFetch(`/api/listings?search=${encodeURIComponent(q)}&limit=8`),
    ]).then(([pr, sr, slr, hr]) => {
      setProducts(pr.status === "fulfilled" ? (pr.value?.products || pr.value || []) : []);
      setServices(sr.status === "fulfilled" ? (sr.value?.services || sr.value || []) : []);
      setSellers(slr.status === "fulfilled" ? (Array.isArray(slr.value) ? slr.value : slr.value?.sellers || []) : []);
      setHostels(hr.status === "fulfilled" ? (hr.value?.listings || hr.value || []) : []);
    }).finally(() => setLoading(false));
  }, [q]);

  const total = products.length + services.length + sellers.length + hostels.length;

  const showProducts = tab === "All" || tab === "Products";
  const showServices = tab === "All" || tab === "Services";
  const showSellers  = tab === "All" || tab === "Stores";
  const showHostels  = tab === "All" || tab === "Hostels";

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "16px 16px 0" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {q ? <>Results for "<span style={{ color: "var(--accent)" }}>{q}</span>"</> : "Search"}
        </h1>
        {!loading && q && (
          <p style={{ margin: "0 0 12px", color: "var(--ink-3)", fontSize: "1.3rem" }}>
            {total} result{total !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Tab filter */}
      <div style={{ padding: "0 16px 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <span key={t} className={`chip${tab === t ? " active" : ""}`} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setTab(t)}>{t}</span>
        ))}
      </div>

      {loading && <Skel.SearchResults />}

      {/* No query — prompt user to search */}
      {!q && !loading && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <i className="fas fa-magnifying-glass" />
          <h3>What are you looking for?</h3>
          <p>Search for products, services, or stores across campus</p>
        </div>
      )}

      {/* Query with no results */}
      {!loading && q && total === 0 && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <i className="fas fa-circle-xmark" />
          <h3>No results for "{q}"</h3>
          <p>Try a different keyword or browse by category</p>
        </div>
      )}

      {/* Products */}
      {showProducts && products.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>
            <h2>Products <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({products.length})</span></h2>
            <span className="more" style={{ cursor: "pointer" }} onClick={() => navigate(`/market?search=${encodeURIComponent(q)}`)}>See all in Market</span>
          </div>
          <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {products.map((p) => <ProductCard key={p._id} product={p} variant="always" onAddToCart={() => {}} />)}
          </div>
        </>
      )}

      {/* Services */}
      {showServices && services.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>
            <h2>Services <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({services.length})</span></h2>
            <span className="more" style={{ cursor: "pointer" }} onClick={() => navigate(`/services?search=${encodeURIComponent(q)}`)}>See all</span>
          </div>
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {services.map((s) => (
              <div key={s._id} className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => navigate(`/services/${s._id}`)}>
                <div style={{ width: 52, height: 52, borderRadius: "var(--r-md)", overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                  <Ph kind="services" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.4rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title || s.name}</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>{s.category}</div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.4rem", flexShrink: 0 }}>
                  {s.rate ? `₦${Number(s.rate).toLocaleString("en-NG")}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Stores */}
      {showSellers && sellers.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>
            <h2>Stores <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({sellers.length})</span></h2>
            <span className="more" style={{ cursor: "pointer" }} onClick={() => navigate("/store")}>See all</span>
          </div>
          <div style={{ padding: "0 16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {sellers.map((s) => (
              <div key={s._id} className="card" style={{ padding: 16, textAlign: "center", cursor: "pointer" }} onClick={() => navigate(`/store/${s._id}`)}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", margin: "0 auto 8px", border: "2px solid var(--accent)" }}>
                  {s.avatar?.url ? <img src={s.avatar.url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Ph kind="portrait-1" label={(s.storeName || s.name || "S")[0]} />}
                </div>
                <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{s.storeName || s.name}</div>
                {s.rating > 0 && (
                  <div className="rating" style={{ justifyContent: "center", marginTop: 4, fontSize: "1.1rem" }}>
                    <i className="fas fa-star star" /> {s.rating}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hostels */}
      {showHostels && hostels.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>
            <h2>Hostels <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({hostels.length})</span></h2>
            <span className="more" style={{ cursor: "pointer" }} onClick={() => navigate(`/hostel?search=${encodeURIComponent(q)}`)}>See all</span>
          </div>
          <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {hostels.map((h) => (
              <div key={h._id} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => navigate(`/hostel/${h._id}`)}>
                <div style={{ width: 64, height: 64, borderRadius: "var(--r-md)", overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                  <Ph kind="hostel-1" label="" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.4rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}><i className="fas fa-location-dot" /> {h.location || h.address}</div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.4rem", flexShrink: 0 }}>
                  {h.price ? `₦${Number(h.price).toLocaleString("en-NG")}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}
