import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import Skel from "../components/Skel";

export default function Wishlist() {
  const navigate  = useNavigate();
  const showToast = useToast();
  const { toggleListing } = useWishlist();

  const [items,        setItems]        = useState([]);
  const [savedHostels, setSavedHostels] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [authError,    setAuthError]    = useState(false);
  const [adding,       setAdding]       = useState({});

  useEffect(() => {
    apiFetch("/api/wishlist")
      .then((d) => {
        setItems(d.items || []);
        setSavedHostels(d.listings || []);
      })
      .catch((err) => { if (err?.status === 401) setAuthError(true); })
      .finally(() => setLoading(false));
  }, []);

  async function remove(productId) {
    setItems((prev) => prev.filter((p) => p._id !== productId));
    try {
      await apiFetch(`/api/wishlist/${productId}`, { method: "POST" });
      showToast("Removed from wishlist", "success");
    } catch {
      showToast("Couldn't remove item. Try again.", "error");
      apiFetch("/api/wishlist")
        .then((d) => setItems(d.items || []))
        .catch(() => {});
    }
  }

  async function addToCart(product) {
    if (adding[product._id]) return;
    setAdding((prev) => ({ ...prev, [product._id]: true }));
    try {
      await apiFetch("/api/cart/add", { method: "POST", body: { productId: product._id, quantity: 1 } });
      showToast("Added to cart!", "success");
    } catch (err) {
      if (err?.status === 401) {
        showToast("Sign in to add items to your cart", "warn");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        showToast("Couldn't add to cart. Try again.", "error");
      }
    } finally {
      setAdding((prev) => ({ ...prev, [product._id]: false }));
    }
  }

  return (
    <div className="page">
      <Navbar />

      {/* Header */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Saved Items</h1>
          {!loading && (
            <p style={{ fontSize: "1.25rem", color: "var(--ink-3)", margin: "2px 0 0" }}>
              {items.length + savedHostels.length} {(items.length + savedHostels.length) === 1 ? "item" : "items"} saved
            </p>
          )}
        </div>
        {(items.length > 0 || savedHostels.length > 0) && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/market")}>
            <i className="fas fa-store" /> Browse more
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 100px" }}>
        {/* ── Saved Hostels (localStorage) ── */}
        {savedHostels.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                <i className="fas fa-building" style={{ marginRight: 8, color: "var(--accent)" }} />Saved Hostels
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/hostel")}>
                <i className="fas fa-arrow-right" /> Browse more
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {savedHostels.map((h) => {
                const imgUrl = h.images?.[0]?.url || (typeof h.images?.[0] === "string" ? h.images[0] : null);
                return (
                  <div
                    key={h._id}
                    className="card"
                    style={{ padding: 12, display: "flex", gap: 12, cursor: "pointer", alignItems: "center" }}
                    onClick={() => navigate(`/hostel/${h._id}`)}
                  >
                    <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                      {imgUrl
                        ? <img src={imgUrl} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Ph kind="hostel-1" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                      {h.location && <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}><i className="fas fa-location-dot" style={{ marginRight: 4 }} />{h.location}</div>}
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>{naira(h.price)} <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--ink-3)" }}>{h.rate || "/ yr"}</span></div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: "#ef4444", flexShrink: 0 }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSavedHostels((prev) => prev.filter((x) => x._id !== h._id));
                        try {
                          await toggleListing(h._id);
                          showToast("Removed from saved", "info");
                        } catch {
                          setSavedHostels((prev) => [...prev, h]);
                          showToast("Could not remove. Try again.", "error");
                        }
                      }}
                    >
                      <i className="fas fa-heart" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Marketplace wishlist ── */}
        {loading ? (
          <Skel.WishlistGrid />
        ) : authError ? (
          items.length === 0 && savedHostels.length === 0 ? <AuthPrompt navigate={navigate} /> : null
        ) : items.length === 0 && savedHostels.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : items.length > 0 ? (
          <>
            {savedHostels.length > 0 && (
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 12px" }}>
                <i className="fas fa-store" style={{ marginRight: 8, color: "var(--accent)" }} />Saved Products
              </h2>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
              {items.map((product) => (
                <WishlistCard
                  key={product._id}
                  product={product}
                  adding={!!adding[product._id]}
                  onRemove={() => remove(product._id)}
                  onAddToCart={() => addToCart(product)}
                  onView={() => navigate(`/products/${product._id}`)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <BottomNav />
    </div>
  );
}

function WishlistCard({ product, adding, onRemove, onAddToCart, onView }) {
  const imgSrc = getImageUrl(product?.images?.[0]);

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden", cursor: "pointer", position: "relative", transition: "box-shadow .15s" }}
      onClick={onView}
    >
      {/* Remove button */}
      <button
        className="icon-btn"
        title="Remove from wishlist"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(255,255,255,.92)", color: "#ef4444", width: 32, height: 32, fontSize: "1.3rem", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}
      >
        <i className="fas fa-heart" />
      </button>

      {/* Image */}
      <div style={{ aspectRatio: "1 / 1", background: "var(--surface)", overflow: "hidden" }}>
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
        ) : (
          <Ph kind={product.category?.name?.toLowerCase() || "default"} />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.35, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.name}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{naira(product.price)}</span>
          {product.rating && (
            <span style={{ fontSize: "1.1rem", color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 3 }}>
              <i className="fas fa-star" style={{ color: "#f59e0b", fontSize: "1rem" }} /> {product.rating}
            </span>
          )}
        </div>

        {product.condition && (
          <span style={{ display: "inline-block", marginBottom: 10, fontSize: "1.1rem", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--r-pill)", background: product.condition === "New" ? "rgba(34,197,94,.1)" : "rgba(249,115,22,.1)", color: product.condition === "New" ? "#16a34a" : "var(--accent)" }}>
            {product.condition}
          </span>
        )}

        <button
          className="btn btn-primary btn-sm"
          style={{ width: "100%", borderRadius: "var(--r-pill)" }}
          onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
          disabled={adding}
        >
          {adding
            ? <i className="fas fa-spinner fa-spin" />
            : <><i className="fas fa-bag-shopping" /> Add to Cart</>}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ navigate }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "3rem", color: "var(--ink-4)" }}>
        <i className="fas fa-heart" />
      </div>
      <h3 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 8px", color: "var(--ink-1)" }}>Nothing saved yet</h3>
      <p style={{ fontSize: "1.4rem", color: "var(--ink-3)", margin: "0 0 28px" }}>
        Tap the heart icon on any product to save it here
      </p>
      <button className="btn btn-primary" style={{ borderRadius: "var(--r-pill)" }} onClick={() => navigate("/market")}>
        <i className="fas fa-store" /> Browse the market
      </button>
    </div>
  );
}

function AuthPrompt({ navigate }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "3rem", color: "var(--ink-4)" }}>
        <i className="fas fa-lock" />
      </div>
      <h3 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 8px", color: "var(--ink-1)" }}>Sign in to view your wishlist</h3>
      <p style={{ fontSize: "1.4rem", color: "var(--ink-3)", margin: "0 0 28px" }}>
        Save products you love and find them here any time
      </p>
      <button className="btn btn-primary" style={{ borderRadius: "var(--r-pill)" }} onClick={() => navigate("/login")}>
        Sign in
      </button>
    </div>
  );
}
