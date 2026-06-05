import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Ph from "./Ph";
import { getImageUrl, naira } from "./ProductCard";
import { useToast } from "../context/ToastContext";
import { useCart } from "../context/CartContext";

export default function QuickViewModal({ product, onClose }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { addToCart } = useCart();
  const allImgs = (product.images || []).map(getImageUrl).filter(Boolean);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeImg = allImgs[activeIdx] || null;

  async function handleAddToCart() {
    try {
      await addToCart(product._id);
      showToast("Added to cart!", "success");
    } catch (err) {
      if (err?.status === 401) {
        showToast("Sign in to add items to your cart", "warn");
        setTimeout(() => { onClose(); navigate("/login"); }, 1500);
      } else {
        showToast("Couldn't add to cart. Try again.", "error");
      }
    }
  }

  function goToProduct() {
    onClose();
    navigate(`/products/${product._id}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main image */}
        <div style={{ position: "relative", height: 280, background: "var(--surface)", overflow: "hidden", flexShrink: 0 }}>
          {activeImg ? (
            <img
              key={activeImg}
              src={activeImg}
              alt={product.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "var(--surface)" }}
            />
          ) : (
            <Ph kind={product.category?.name?.toLowerCase() || "default"} />
          )}
          {product.tag && <span className="product-tag">{product.tag}</span>}
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", color: "var(--ink-2)", zIndex: 2 }}
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        {/* Thumbnail strip */}
        {allImgs.length > 1 && (
          <div style={{ display: "flex", gap: 6, padding: "10px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
            {allImgs.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                style={{
                  flexShrink: 0, width: 52, height: 52, padding: 0, border: "none", borderRadius: "var(--r-md)", overflow: "hidden", cursor: "pointer",
                  outline: i === activeIdx ? "2px solid var(--accent)" : "2px solid var(--line)",
                  outlineOffset: 1,
                  opacity: i === activeIdx ? 1 : 0.7,
                  transition: "outline .15s, opacity .15s",
                }}
              >
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{product.name}</h2>
            {product.rating > 0 && (
              <div className="rating" style={{ flexShrink: 0, marginTop: 2 }}>
                <i className="fas fa-star star" /> {Number(product.rating).toFixed(1)}
              </div>
            )}
          </div>

          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", margin: "8px 0 10px", letterSpacing: "-0.02em" }}>
            {naira(product.price)}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {product.category?.name && <span className="chip">{product.category.name}</span>}
            {product.condition && (
              <span className="chip" style={{ background: product.condition === "New" ? "#dcfce7" : "var(--surface)", color: product.condition === "New" ? "#16a34a" : "var(--ink-2)" }}>
                {product.condition}
              </span>
            )}
            {product.seller?.storeName && (
              <span className="chip" style={{ background: "var(--surface)" }}>
                <i className="fas fa-store" style={{ marginRight: 4, fontSize: "1rem" }} />{product.seller.storeName}
              </span>
            )}
          </div>

          {product.description && (
            <p style={{ margin: "0 0 16px", fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.description}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddToCart}>
              <i className="fas fa-bag-shopping" /> Add to cart
            </button>
            <button className="btn btn-ghost" onClick={goToProduct}>
              View details <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
