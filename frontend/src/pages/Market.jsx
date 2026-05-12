import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const CATS = ["All", "Electronics", "Books", "Fashion", "Food", "Beauty", "Other"];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low – High", value: "price-asc" },
  { label: "Price: High – Low", value: "price-desc" },
];

const CONDITIONS = ["All", "New", "Used"];

export default function Market() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cat, setCat] = useState(searchParams.get("category") || "All");
  const [sort, setSort] = useState("newest");
  const [condition, setCondition] = useState("All");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const filterBtnRef = useRef(null);

  const [pendingSort, setPendingSort] = useState(sort);
  const [pendingCondition, setPendingCondition] = useState(condition);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat !== "All") params.set("category", cat.toLowerCase());
    if (condition !== "All") params.set("condition", condition.toLowerCase());
    params.set("sort", sort);
    apiFetch(`/api/products?${params}`)
      .then((d) => { setProducts(d.products || d || []); setTotal(d.total || (d.products || d || []).length); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [cat, sort, condition]);

  function openFilter() {
    setPendingSort(sort);
    setPendingCondition(condition);
    if (isDesktop && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setFilterOpen(true);
  }

  function applyFilter() {
    setSort(pendingSort);
    setCondition(pendingCondition);
    setFilterOpen(false);
  }

  function resetFilter() {
    setPendingSort("newest");
    setPendingCondition("All");
  }

  const activeFilterCount = (sort !== "newest" ? 1 : 0) + (condition !== "All" ? 1 : 0);

  const filterContent = (
    <>
      {/* Sort */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Sort by</div>
        {isDesktop ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setPendingSort(o.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: "var(--r-md)",
                  background: pendingSort === o.value ? "var(--surface)" : "transparent",
                  border: "none", cursor: "pointer", fontSize: "1.3rem",
                  fontWeight: pendingSort === o.value ? 700 : 500,
                  color: pendingSort === o.value ? "var(--accent)" : "var(--ink-1)",
                  textAlign: "left", width: "100%", fontFamily: "var(--font-sans)",
                }}
              >
                {pendingSort === o.value
                  ? <i className="fas fa-check" style={{ fontSize: ".9rem", color: "var(--accent)", width: 14 }} />
                  : <span style={{ width: 14, display: "inline-block" }} />
                }
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setPendingSort(o.value)}
                className={`chip${pendingSort === o.value ? " active" : ""}`}
              >
                {pendingSort === o.value && <i className="fas fa-check" style={{ fontSize: "1rem" }} />}
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "var(--line)", margin: "0 0 14px" }} />

      {/* Condition */}
      <div>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Condition</div>
        <div style={{ display: "flex", gap: 8 }}>
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => setPendingCondition(c)}
              className={`chip${pendingCondition === c ? " active" : ""}`}
            >
              {pendingCondition === c && <i className="fas fa-check" style={{ fontSize: "1rem" }} />}
              {c}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="page">
      <Navbar />

      {/* ── Desktop: dropdown popover ── */}
      {isDesktop && (
        <>
          {filterOpen && (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 80 }}
              onClick={() => setFilterOpen(false)}
            />
          )}
          <div style={{
            position: "fixed",
            top: popoverPos.top,
            right: popoverPos.right,
            zIndex: 81,
            width: 296,
            background: "var(--white)",
            borderRadius: "var(--r-lg, 16px)",
            boxShadow: "0 8px 40px rgba(15,23,42,.18)",
            border: "1px solid var(--line)",
            opacity: filterOpen ? 1 : 0,
            pointerEvents: filterOpen ? "auto" : "none",
            transform: filterOpen ? "translateY(0) scale(1)" : "translateY(-8px) scale(.97)",
            transition: "opacity .18s, transform .18s",
          }}>
            {/* header */}
            <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 700, fontSize: "1.5rem" }}>Filter & Sort</span>
              <button className="icon-btn" onClick={() => setFilterOpen(false)} style={{ width: 28, height: 28, fontSize: "1.2rem" }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div style={{ padding: "14px 16px 0" }}>
              {filterContent}
            </div>

            {/* footer */}
            <div style={{ display: "flex", gap: 8, padding: "14px 16px" }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: "1.2rem" }} onClick={resetFilter}>Reset</button>
              <button className="btn btn-primary" style={{ flex: 2, fontSize: "1.2rem" }} onClick={applyFilter}>
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile: bottom sheet ── */}
      {!isDesktop && (
        <>
          {filterOpen && (
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 80 }}
              onClick={() => setFilterOpen(false)}
            />
          )}
          <div style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            zIndex: 81,
            background: "var(--white)",
            borderRadius: "24px 24px 0 0",
            boxShadow: "0 -4px 32px rgba(15,23,42,.14)",
            transform: filterOpen ? "translateY(0)" : "translateY(110%)",
            transition: "transform .3s cubic-bezier(.4,0,.2,1)",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}>
            {/* drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line-strong)", margin: "10px auto 0" }} />

            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 0" }}>
              <span style={{ fontWeight: 700, fontSize: "1.7rem" }}>Filter & Sort</span>
              <button className="icon-btn" onClick={() => setFilterOpen(false)} style={{ width: 32, height: 32, fontSize: "1.4rem" }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div style={{ height: 1, background: "var(--line)", margin: "12px 0 0" }} />

            <div style={{ padding: "16px 20px 0" }}>
              {filterContent}
            </div>

            {/* footer */}
            <div style={{ display: "flex", gap: 10, padding: "16px 20px 20px" }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetFilter}>Reset</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={applyFilter}>
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="page-inner">
        {/* Page header */}
        <div style={{ padding: "12px 0 0" }}>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 4px" }}>Marketplace</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>{total} items from verified UNILAG sellers</p>
        </div>

        {/* Category chips */}
        <div style={{ padding: "12px 0 0", overflowX: "auto", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {CATS.map((c) => (
              <span key={c} className={`chip${cat === c ? " active" : ""}`} onClick={() => setCat(c)} style={{ cursor: "pointer", flexShrink: 0 }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Results row + filter button */}
        <div style={{ padding: "12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "1.2rem", color: "var(--ink-3)", fontWeight: 600 }}>
            {loading ? "Loading…" : `${total} result${total !== 1 ? "s" : ""}`}
          </span>
          <button
            ref={filterBtnRef}
            onClick={openFilter}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: "var(--r-pill)",
              background: activeFilterCount > 0 ? "var(--navy-800)" : "var(--surface)",
              color: activeFilterCount > 0 ? "#fff" : "var(--ink-1)",
              border: "none", cursor: "pointer", fontSize: "1.3rem", fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            <i className="fas fa-sliders" />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        {/* Product grid */}
        <div className="grid-2col" style={{ padding: "14px 0 24px" }}>
          {loading
            ? [1,2,3,4,5,6].map(i => <Skel.ProductCard key={i} />)
            : products.length === 0
            ? (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <i className="fas fa-box-open" />
                  <h3>No products found</h3>
                  <p>{cat !== "All" || condition !== "All" ? "Try adjusting your filters" : "Check back soon for new listings"}</p>
                </div>
              )
            : products.map((p) => (
                <ProductCard key={p._id} product={p} variant="always" onAddToCart={() => {}} />
              ))
          }
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
