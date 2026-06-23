import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import Ph from "../components/Ph";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";


const SORT_OPTIONS = [
  { label: "Featured", value: "random" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low – High", value: "price-asc" },
  { label: "Price: High – Low", value: "price-desc" },
];

const CONDITIONS = ["All", "New", "Used"];

export default function Market() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cat, setCat] = useState(searchParams.get("category") || "All");
  const [sort, setSort] = useState("random");
  const [cats, setCats] = useState(["All"]);
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 52;
  // Track previous filter values so we can detect changes and reset page atomically
  // within a single effect, avoiding a redundant fetch at the stale page number.
  const prevFilterRef = useRef({ cat, sort, condition });

  useEffect(() => {
    apiFetch("/api/categories")
      .then((d) => {
        const names = (d.categories || d || []).map((c) => c.name).filter(Boolean);
        const loaded = names.length ? ["All", ...names] : ["All"];
        setCats(loaded);
        // Reconcile URL-supplied category case-insensitively; reset to All if not found
        setCat((prev) => {
          if (prev === "All") return prev;
          const match = loaded.find((c) => c.toLowerCase() === prev.toLowerCase());
          return match || "All";
        });
      })
      .catch(() => {
        // Leave cats as ["All"] so filters still render
      });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const prev = prevFilterRef.current;
    const filterChanged = prev.cat !== cat || prev.sort !== sort || prev.condition !== condition;
    prevFilterRef.current = { cat, sort, condition };

    // When filters change and we're not on page 1, reset page and let the re-render
    // trigger this effect again at page=1 — avoids a redundant fetch at the old page.
    if (filterChanged && page !== 1) {
      setPage(1);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (cat !== "All") params.set("category", cat.toLowerCase());
    if (condition !== "All") params.set("condition", condition.toLowerCase());
    params.set("sort", sort);
    params.set("limit", String(PAGE_SIZE));
    params.set("skip", String((page - 1) * PAGE_SIZE));
    apiFetch(`/api/products?${params}`)
      .then((d) => {
        const list = Array.isArray(d?.products) ? d.products : Array.isArray(d) ? d : [];
        setProducts(list);
        const t = d?.total ?? list.length;
        setTotal(t);
        setTotalPages(Math.max(1, Math.ceil(t / PAGE_SIZE)));
      })
      .catch(() => { setProducts([]); setTotal(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [cat, sort, condition, page]);

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
    setPendingSort("random");
    setPendingCondition("All");
  }

  const activeFilterCount = (sort !== "random" ? 1 : 0) + (condition !== "All" ? 1 : 0);

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
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort products"
            aria-hidden={!filterOpen}
            style={{
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
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort products"
            aria-hidden={!filterOpen}
            style={{
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
            {cats.map((c) => (
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

        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 0 24px", flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ minWidth: 80 }}
            >
              <i className="fas fa-chevron-left" /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "var(--ink-3)", fontSize: "1.3rem" }}>…</span>
                ) : (
                  <button
                    key={p}
                    className={`btn${p === page ? " btn-primary" : " btn-ghost"}`}
                    onClick={() => setPage(p)}
                    style={{ minWidth: 40 }}
                  >
                    {p}
                  </button>
                )
              )
            }

            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ minWidth: 80 }}
            >
              Next <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
