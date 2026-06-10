import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Ph from "./Ph";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import QuickViewModal from "./QuickViewModal";
import { cloudImg } from "../utils/cloudinary";

export function getImageUrl(imageData, fallback = null) {
  if (!imageData) return fallback;
  if (typeof imageData === "string") return imageData;
  if (typeof imageData === "object" && imageData.url) return imageData.url;
  return fallback;
}

export function naira(n) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

export default function ProductCard({ product, variant = "always", onAddToCart }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const { cartItems, addToCart, updateQty } = useCart();
  const [quickView, setQuickView] = useState(false);
  const [adding, setAdding] = useState(false);
  const [qtyLoading, setQtyLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const wishlisted = wishlistIds.has(product?._id?.toString());
  const imgSrc = cloudImg(getImageUrl(product?.images?.[0]), { w: 400 });

  const productId = product?._id?.toString();
  const cartItem = cartItems.get(productId);
  const inCart = !!cartItem;
  const cartQty = cartItem?.quantity || 0;

  async function handleAddToCart(e) {
    e.stopPropagation();
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(product._id);
      showToast("Added to cart!", "success");
      onAddToCart?.();
    } catch (err) {
      if (err?.status === 401 || String(err).includes("401")) {
        showToast("Sign in to add items to your cart", "warn");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        showToast("Couldn't add to cart. Try again.", "error");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleQtyChange(e, delta) {
    e.stopPropagation();
    if (qtyLoading) return;
    setQtyLoading(true);
    try {
      await updateQty(productId, cartQty + delta);
    } catch {
      showToast("Couldn't update quantity", "error");
    } finally {
      setQtyLoading(false);
    }
  }

  async function handleWishlist(e) {
    e.stopPropagation();
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      await toggleWishlist(product._id);
      showToast(!wishlisted ? "Saved to wishlist!" : "Removed from wishlist", "success");
    } catch (err) {
      if (err?.status === 401 || String(err).includes("401")) {
        showToast("Sign in to save items to your wishlist", "warn");
      } else {
        showToast("Couldn't update wishlist. Try again.", "error");
      }
    } finally {
      setWishlistLoading(false);
    }
  }

  const totalStock = (product?.stock || 0) + (Array.isArray(product?.variants) ? product.variants.reduce((s, v) => s + (v.stock || 0), 0) : 0);
  const outOfStock = totalStock <= 0;
  const cls = `product-card${variant === "hover" ? " hover-reveal" : ""}`;

  return (
    <>
    <div className={cls} onClick={() => navigate(`/products/${product._id}`)}>
      <div className="product-thumb">
        {outOfStock
          ? <span className="product-tag" style={{ background: "#6b7280" }}>Out of Stock</span>
          : product.salePrice != null && product.salePrice < product.price
            ? <span className="product-tag" style={{ background: "#ef4444" }}>Sale</span>
            : product.tag && <span className="product-tag">{product.tag}</span>}
        <button
          className="product-fav"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          style={wishlisted ? { background: "#ef4444", color: "#fff", borderColor: "#ef4444" } : undefined}
        >
          {wishlistLoading
            ? <i className="fas fa-spinner fa-spin" />
            : <i className={wishlisted ? "fas fa-heart" : "far fa-heart"} />}
        </button>
        {imgSrc ? (
          <img src={imgSrc} alt={product.name} loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", padding: 4, opacity: outOfStock ? 0.55 : 1 }} />
        ) : (
          <Ph kind={product.category?.name?.toLowerCase() || "default"} />
        )}
      </div>
      <div className="product-meta">
        <div className="product-name">{product.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
          {product.salePrice != null && product.salePrice < product.price ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <div className="product-price" style={{ color: "#ef4444" }}>{naira(product.salePrice)}</div>
              <div style={{ fontSize: "1rem", color: "var(--ink-4)", textDecoration: "line-through" }}>{naira(product.price)}</div>
            </div>
          ) : (
            <div className="product-price">{naira(product.price)}</div>
          )}
          {product.rating && (
            <div className="rating" style={{ fontSize: "1.1rem" }}>
              <i className="fas fa-star star" /> {product.rating}
            </div>
          )}
        </div>
      </div>
      <div className="product-actions">
        {!inCart && (
          <button className="icon-btn" title="Quick view" onClick={(e) => { e.stopPropagation(); setQuickView(true); }}>
            <i className="far fa-eye" />
          </button>
        )}
        {inCart ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}
          >
            <button
              className="icon-btn"
              style={{ width: 30, height: 30, background: "var(--surface)", borderRadius: 8, flexShrink: 0 }}
              onClick={(e) => handleQtyChange(e, -1)}
              disabled={qtyLoading}
            >
              {qtyLoading ? <i className="fas fa-spinner fa-spin" style={{ fontSize: "0.75rem" }} /> : <i className="fas fa-minus" style={{ fontSize: "0.75rem" }} />}
            </button>
            <span style={{ minWidth: 22, textAlign: "center", fontWeight: 700, fontSize: "1.3rem" }}>{cartQty}</span>
            <button
              className="icon-btn primary"
              style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }}
              onClick={(e) => handleQtyChange(e, 1)}
              disabled={qtyLoading}
            >
              <i className="fas fa-plus" style={{ fontSize: "0.75rem" }} />
            </button>
          </div>
        ) : (
          <button className="icon-btn primary" onClick={handleAddToCart} disabled={adding || outOfStock} style={outOfStock ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
            {adding ? <i className="fas fa-spinner fa-spin" /> : outOfStock ? "Sold out" : <><i className="fas fa-bag-shopping" /> Add</>}
          </button>
        )}
      </div>
    </div>
    {quickView && <QuickViewModal product={product} onClose={() => setQuickView(false)} />}
    </>
  );
}
