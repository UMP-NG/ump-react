import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import Skel from "../components/Skel";
import ReportModal from "../components/ReportModal";
import NegotiationModal from "../components/NegotiationModal";

const TABS = [
  { key: "description",  label: "Description" },
  { key: "specs",        label: "Specifications" },
  { key: "reviews",      label: "Reviews" },
  { key: "qa",           label: "Q&A" },
];

function Stars({ value, onChange, readonly }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => !readonly && onChange?.(n)}
          style={{
            background: "none", border: "none", padding: "0 1px",
            cursor: readonly ? "default" : "pointer",
            fontSize: readonly ? "1.1rem" : "1.8rem",
            color: n <= value ? "#f59e0b" : "var(--ink-4)",
          }}
        >
          <i className={n <= value ? "fas fa-star" : "far fa-star"} />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, updateQty } = useCart();
  const { user } = useUser();
  const [product, setProduct]   = useState(null);
  const [tab, setTab]           = useState("description");
  const [showReport, setShowReport] = useState(false);
  // Always 1 — the qty stepper only appears once an item is in the cart (see
  // cartEntry below), where quantity is controlled via updateQty instead.
  const qty = 1;
  const [thumb, setThumb] = useState(0);
  const [selectedColor,   setSelectedColor]   = useState("");
  const [selectedSize,    setSelectedSize]    = useState("");
  const [selectedType,    setSelectedType]    = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [related, setRelated] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(null);
  const [toast, setToast] = useState("");
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const toastTimer = useRef(null);
  // Restock alert & price watch
  const [restockSubscribed, setRestockSubscribed] = useState(false);
  const [watchingPrice, setWatchingPrice] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  // Q&A
  const [questions, setQuestions] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  // Seller reply UI
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  // Q&A answering (seller)
  const [answeringQ, setAnsweringQ] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [answerLoading, setAnswerLoading] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Reset variant selections whenever the viewed product changes
  useEffect(() => {
    setSelectedColor("");
    setSelectedSize("");
    setSelectedType("");
    setSelectedVariant(null);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/products/${id}`)
      .then((d) => {
        const p = d.product || d;
        setProduct(p);
        setFollowing(p.seller?.isFollowing || false);
        setWatchingPrice(p.isWatchingPrice ?? false);
        return Promise.all([
          apiFetch(`/api/products/${id}/related`).catch(() => apiFetch(`/api/products?limit=6`)),
          apiFetch(`/api/reviews/Product/${id}`).catch(() => ({ reviews: [] })),
        ]);
      })
      .then(([pd, rd]) => {
        setRelated((pd.products || pd || []).filter((p) => p._id !== id).slice(0, 4));
        setReviews(rd.reviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab !== "reviews" || !id) return;
    setHasPurchased(null);
    apiFetch(`/api/orders/has-purchased/${id}`)
      .then((d) => setHasPurchased(d.purchased))
      .catch((err) => {
        // 401 = not logged in → treat same as not purchased
        // 5xx / network = unknown, use "error" so we don't falsely show the lock message
        setHasPurchased(err?.status === 401 ? false : "error");
      });
  }, [tab, id]);

  useEffect(() => {
    if (tab !== "qa" || !id) return;
    setQaLoading(true);
    apiFetch(`/api/questions/${id}`)
      .then((d) => setQuestions(d.questions || []))
      .catch(() => {})
      .finally(() => setQaLoading(false));
  }, [tab, id]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function handleRestockAlert() {
    if (!user) { showToast("Please sign in to get notified"); return; }
    setRestockLoading(true);
    try {
      const res = await apiFetch(`/api/products/${id}/notify-restock`, { method: "POST" });
      setRestockSubscribed(res.subscribed);
      showToast(res.subscribed ? "We'll notify you when back in stock!" : "Notification removed");
    } catch (err) { showToast(err?.message || "Failed"); }
    finally { setRestockLoading(false); }
  }

  async function handleWatchPrice() {
    if (!user) { showToast("Please sign in to watch prices"); return; }
    setWatchLoading(true);
    try {
      const res = await apiFetch(`/api/products/${id}/watch-price`, { method: "POST" });
      setWatchingPrice(res.watching);
      showToast(res.watching ? "Price drop alert set! We'll notify you." : "Price watch removed");
    } catch (err) { showToast(err?.message || "Failed"); }
    finally { setWatchLoading(false); }
  }

  async function submitQuestion() {
    if (!newQuestion.trim()) return;
    setQaSubmitting(true);
    try {
      const res = await apiFetch(`/api/questions/${id}`, { method: "POST", body: { question: newQuestion } });
      setQuestions((prev) => [res.question, ...prev]);
      setNewQuestion("");
      showToast("Question posted!");
    } catch (err) { showToast(err?.message || "Failed to post question"); }
    finally { setQaSubmitting(false); }
  }

  async function submitReply(reviewId) {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const res = await apiFetch(`/api/reviews/${reviewId}/reply`, { method: "PUT", body: { reply: replyText } });
      setReviews((prev) => prev.map((r) => r._id === reviewId ? res.review : r));
      setReplyingTo(null); setReplyText("");
      showToast("Reply posted!");
    } catch (err) { showToast(err?.message || "Failed"); }
    finally { setReplyLoading(false); }
  }

  async function submitAnswer(questionId) {
    if (!answerText.trim()) return;
    setAnswerLoading(true);
    try {
      const res = await apiFetch(`/api/questions/${questionId}/answer`, { method: "POST", body: { answer: answerText } });
      setQuestions((prev) => prev.map((q) => q._id === questionId ? res.question : q));
      setAnsweringQ(null); setAnswerText("");
      showToast("Answer posted!");
    } catch (err) { showToast(err?.message || "Failed to post answer"); }
    finally { setAnswerLoading(false); }
  }

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  async function handleFollow() {
    if (!product?.seller) return;
    setFollowLoading(true);
    // Use seller profile ID if available, otherwise fall back to User ID (route accepts both)
    const targetId = product.seller.sellerProfileId || product.seller._id;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      const res = await apiFetch(`/api/sellers/${targetId}/${wasFollowing ? "unfollow" : "follow"}`, { method: "POST" });
      const serverFollowing = typeof res.following === "boolean" ? res.following : !wasFollowing;
      setFollowing(serverFollowing);
    } catch (err) {
      setFollowing(wasFollowing);
      if (err.status === 401) {
        showToast("Please sign in to follow this seller");
      } else {
        showToast(err.body?.message || err.message || "Action failed");
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleShare() {
    const url = window.location.href;
    const title = product?.name || "Check this out on UMP";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* ignore */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard");
      } catch {
        showToast("Copy this link: " + url);
      }
    }
  }

  async function handleWishlist() {
    setWishlistLoading(true);
    try {
      const d = await apiFetch(`/api/wishlist/${id}`, { method: "POST" });
      setWishlisted(d.inWishlist);
      showToast(d.inWishlist ? "Added to wishlist" : "Removed from wishlist");
    } catch (err) {
      if (err.status === 401) showToast("Please sign in to save items");
      else showToast("Could not update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }

  async function handleAddToCart() {
    if (cartLoading) return;
    const validColor = !product?.colors?.length || product.colors.some((c) => c.name === selectedColor);
    const validSize  = !product?.sizes?.length  || product.sizes.includes(selectedSize);
    const validType  = !product?.types?.length  || product.types.includes(selectedType);
    const needsColor   = product?.colors?.length   > 0 && (!selectedColor || !validColor);
    const needsSize    = product?.sizes?.length    > 0 && (!selectedSize  || !validSize);
    const needsType    = product?.types?.length    > 0 && (!selectedType  || !validType);
    const needsVariant = hasVariants && !selectedVariant;
    if (needsVariant) { showToast("Please select a variant"); return; }
    if (needsColor)   { showToast("Please select a colour");  return; }
    if (needsSize)    { showToast("Please select a size");    return; }
    if (needsType)    { showToast("Please select a type");    return; }
    setCartLoading(true);
    try {
      await addToCart(id, qty, { selectedColor, selectedSize, selectedType, selectedVariant: selectedVariant?.label || "" });
      navigate("/cart");
    } catch (err) {
      if (err?.status === 401) navigate("/login");
      else showToast(err?.message || "Could not add to cart");
    } finally {
      setCartLoading(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!reviewRating) return showToast("Please select a star rating");
    setReviewLoading(true);
    try {
      const { review } = await apiFetch("/api/reviews", {
        method: "POST",
        body: { refModel: "Product", refId: id, rating: reviewRating, text: reviewText },
      });
      setReviews((prev) => [review, ...prev]);
      setReviewRating(0);
      setReviewText("");
      showToast("Review submitted!");
    } catch (err) {
      if (err.status === 401) navigate("/login");
      else showToast(err.body?.message || "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  }

  if (loading) return (
    <div className="page">
      <Navbar />
      <Skel.ProductDetail />
    </div>
  );
  if (!product) return (
    <div className="page">
      <Navbar />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <p style={{ fontSize: "1.6rem", color: "var(--ink-2)" }}>Product not found.</p>
        <button className="btn btn-primary" onClick={() => navigate("/market")}>Browse marketplace</button>
      </div>
    </div>
  );

  const categoryName = product.category?.name || "Product";
  const categorySlug = categoryName.toLowerCase();
  const images = product.images?.length > 0 ? product.images : [null];
  const imgSrc = getImageUrl(images[thumb]);
  const seller = product.seller;
  const isSeller = !!user && (
    user.roles?.includes("admin") ||
    seller?._id?.toString() === user._id?.toString()
  );
  const hasSpecs = product.specs && Object.keys(product.specs).length > 0;
  const logoUrl = typeof seller?.logo === "string" ? seller.logo : seller?.logo?.url;
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const activeStock = selectedVariant
    ? (selectedVariant.stock ?? 0)
    : hasVariants
      ? product.variants.reduce((s, v) => s + (v.stock ?? 0), 0)
      : product.stock || 0;
  const totalStock = activeStock;
  // isAvailable === false also covers a temporarily closed store (stock may still be > 0)
  const outOfStock = product.isAvailable === false || (selectedVariant
    ? (selectedVariant.stock ?? 0) <= 0
    : hasVariants
      ? product.variants.every(v => (v.stock ?? 0) <= 0)
      : activeStock <= 0);
  const lowStock = !outOfStock && activeStock > 0 && activeStock <= 5;

  // Is this exact product + selected variant already in the buyer's cart?
  // Drives whether the floating bar shows a qty stepper (only once it's
  // actually in the cart) or just a clean "Add to cart" button.
  const cartEntry = [...cartItems.values()].find((item) => {
    const itemProductId = (item.product?._id || item.product)?.toString();
    if (itemProductId !== product._id?.toString()) return false;
    return (item.selectedVariant || "") === (selectedVariant?.label || "");
  });

  function incrementCartEntry() {
    if (!cartEntry) return;
    updateQty(cartEntry._id, Math.min(totalStock, cartEntry.quantity + 1));
  }
  function decrementCartEntry() {
    if (!cartEntry) return;
    updateQty(cartEntry._id, cartEntry.quantity - 1);
  }

  const gallery = (
    <div>
      <div style={{ borderRadius: isDesktop ? "var(--r-2xl)" : "var(--r-lg)", overflow: "hidden", background: "var(--surface)", position: "relative", aspectRatio: "4/3" }}>
        {imgSrc
          ? <img src={imgSrc} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <Ph kind={categorySlug} />}

        {/* back / share / heart overlaid on image */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", zIndex: 5 }}>
          <button className="icon-btn icon-btn-overlay" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn icon-btn-overlay" onClick={handleShare}>
              <i className="fas fa-share-nodes" />
            </button>
            <button className="icon-btn icon-btn-overlay" style={{ color: wishlisted ? "#ef4444" : undefined }} onClick={handleWishlist} disabled={wishlistLoading}>
              {wishlistLoading
                ? <i className="fas fa-spinner fa-spin" style={{ fontSize: "1rem" }} />
                : <i className={wishlisted ? "fas fa-heart" : "far fa-heart"} />}
            </button>
            <button className="icon-btn icon-btn-overlay" style={{ color: "var(--ink-3)" }} onClick={() => setShowReport(true)} title="Report this listing">
              <i className="fas fa-flag" style={{ fontSize: "0.9rem" }} />
            </button>
          </div>
        </div>

        {images.length > 1 && (
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {images.map((_, i) => (
              <span key={i} onClick={() => setThumb(i)} style={{ width: i === thumb ? 20 : 6, height: 6, borderRadius: 6, background: i === thumb ? "#fff" : "rgba(255,255,255,.5)", cursor: "pointer" }} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {images.slice(0, 4).map((img, i) => (
            <button key={i} onClick={() => setThumb(i)} style={{ flex: 1, aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", border: i === thumb ? "2px solid var(--accent)" : "1px solid var(--line)", padding: 0, background: "var(--surface)", cursor: "pointer" }}>
              {img ? <img src={getImageUrl(img)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Ph kind={categorySlug} label="" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const info = (
    <div>
      {/* name + price */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="chip outline" style={{ fontSize: "1.1rem" }}>{categoryName}</span>
        {product.condition && (
          <span style={{ fontSize: "1.1rem", padding: "2px 10px", borderRadius: 20, background: product.condition === "New" ? "#dcfce7" : "#fef3c7", color: product.condition === "New" ? "#16a34a" : "#d97706", fontWeight: 600 }}>
            {product.condition}
          </span>
        )}
      </div>
      <h1 style={{ fontSize: isDesktop ? "2.6rem" : "2.2rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.2 }}>{product.name}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {!selectedVariant && product.salePrice != null && product.salePrice < product.price ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "#ef4444", letterSpacing: "-0.02em" }}>{naira(product.salePrice)}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "var(--ink-4)", textDecoration: "line-through" }}>{naira(product.price)}</div>
            <span style={{ padding: "2px 10px", borderRadius: "var(--r-pill)", background: "#fef2f2", color: "#ef4444", fontSize: "1.1rem", fontWeight: 700 }}>
              -{Math.round((1 - product.salePrice / product.price) * 100)}% OFF
            </span>
          </div>
        ) : (
          <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
            {naira(displayPrice)}
            {hasVariants && !selectedVariant && <span style={{ fontSize: "1.4rem", fontWeight: 500, color: "var(--ink-3)", marginLeft: 8 }}>from</span>}
          </div>
        )}
        {outOfStock && (
          <span style={{ padding: "4px 12px", borderRadius: "var(--r-pill)", background: "#f3f4f6", color: "#6b7280", fontSize: "1.2rem", fontWeight: 700 }}>Out of Stock</span>
        )}
        {lowStock && (
          <span style={{ padding: "4px 12px", borderRadius: "var(--r-pill)", background: "#fef3c7", color: "#d97706", fontSize: "1.2rem", fontWeight: 700 }}>
            <i className="fas fa-triangle-exclamation" style={{ marginRight: 4 }} />Only {totalStock} left!
          </span>
        )}
      </div>
      {/* Sale countdown */}
      {product.saleEndsAt && new Date(product.saleEndsAt) > new Date() && (
        <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: "var(--r-md)", background: "#fef2f2", color: "#dc2626", fontSize: "1.25rem", fontWeight: 600 }}>
          <i className="fas fa-clock" style={{ marginRight: 6 }} />
          Sale ends {new Date(product.saleEndsAt).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      )}

      {/* Colour picker */}
      {Array.isArray(product.colors) && product.colors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>
            Colour{selectedColor ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>{selectedColor}</span> : <span style={{ color: "var(--ink-4)", fontWeight: 400 }}> — select one</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {product.colors.map((c, i) => {
              const active = selectedColor === c.name;
              return (
                <button key={i} type="button" onClick={() => setSelectedColor(active ? "" : c.name)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                    background: active ? "rgba(249,115,22,.12)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    fontSize: "1.2rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {c.code && <span style={{ width: 14, height: 14, borderRadius: "50%", background: c.code, flexShrink: 0, border: "1px solid rgba(0,0,0,.1)" }} />}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size picker */}
      {Array.isArray(product.sizes) && product.sizes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>
            Size{selectedSize ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>{selectedSize}</span> : <span style={{ color: "var(--ink-4)", fontWeight: 400 }}> — select one</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {product.sizes.map((s, i) => {
              const active = selectedSize === s;
              return (
                <button key={i} type="button" onClick={() => setSelectedSize(active ? "" : s)}
                  style={{ minWidth: 44, padding: "6px 14px", borderRadius: "var(--r-md)",
                    background: active ? "rgba(249,115,22,.12)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    fontSize: "1.3rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Named variant picker (e.g. "256GB Black ₦1.1M") */}
      {hasVariants && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>
            Variant{selectedVariant
              ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>{selectedVariant.label}</span>
              : <span style={{ color: "var(--ink-4)", fontWeight: 400 }}> — select one</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {product.variants.map((v, i) => {
              const active = selectedVariant?.label === v.label;
              const gone   = (v.stock ?? 0) <= 0;
              return (
                <button key={i} type="button" onClick={() => setSelectedVariant(active ? null : v)} disabled={gone}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "var(--r-md)", textAlign: "left",
                    background: active ? "rgba(249,115,22,.10)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    cursor: gone ? "not-allowed" : "pointer", opacity: gone ? 0.5 : 1,
                    fontFamily: "var(--font-sans)", fontSize: "1.3rem" }}>
                  <span style={{ fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "var(--ink-1)" }}>{v.label}</span>
                  <span style={{ fontWeight: 700, color: active ? "var(--accent)" : "var(--ink-2)" }}>{naira(v.price)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Type picker */}
      {Array.isArray(product.types) && product.types.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 8 }}>
            Type{selectedType ? <span style={{ color: "var(--accent)", marginLeft: 6 }}>{selectedType}</span> : <span style={{ color: "var(--ink-4)", fontWeight: 400 }}> — select one</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {product.types.map((t, i) => {
              const active = selectedType === t;
              return (
                <button key={i} type="button" onClick={() => setSelectedType(active ? "" : t)}
                  style={{ padding: "6px 14px", borderRadius: "var(--r-md)",
                    background: active ? "rgba(249,115,22,.12)" : "var(--surface)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    fontSize: "1.2rem", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "9px 14px", background: "none", border: "none", cursor: "pointer",
            fontSize: "1.3rem", fontWeight: tab === t.key ? 700 : 500,
            color: tab === t.key ? "var(--accent)" : "var(--ink-3)",
            borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, whiteSpace: "nowrap", fontFamily: "var(--font-sans)",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ paddingTop: 14, minHeight: 80 }}>
        {tab === "description" && (
          <p style={{ fontSize: "1.4rem", color: "var(--ink-2)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
            {product.desc || "No description provided."}
          </p>
        )}
        {tab === "specs" && (
          hasSpecs ? (
            <div>
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-3)" }}>{key}</span>
                  <span style={{ fontSize: "1.3rem", color: "var(--ink-1)" }}>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: "1.4rem", color: "var(--ink-3)", margin: 0 }}>No specifications listed.</p>
        )}
        {tab === "reviews" && (
          <div>
            {/* write a review — only for verified buyers */}
            {hasPurchased === null ? (
              <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)", textAlign: "center" }}>
                <i className="fas fa-spinner fa-spin" style={{ color: "var(--ink-4)", fontSize: "1.4rem" }} />
              </div>
            ) : hasPurchased === "error" ? (
              <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="fas fa-circle-exclamation" style={{ color: "#f59e0b", fontSize: "1.4rem", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                  Could not verify your purchase. Please try refreshing the page.
                </p>
              </div>
            ) : hasPurchased ? (
              <form onSubmit={submitReview} style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 10 }}>Write a review</div>
                <Stars value={reviewRating} onChange={setReviewRating} />
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience…"
                  rows={3}
                  style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--white)", color: "var(--ink-1)", outline: "none" }}
                />
                <button type="submit" className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} disabled={reviewLoading}>
                  {reviewLoading ? <i className="fas fa-spinner fa-spin" /> : "Submit Review"}
                </button>
              </form>
            ) : (
              <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="fas fa-lock" style={{ color: "var(--ink-4)", fontSize: "1.4rem", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                  Only verified buyers can leave a review. Purchase this product to share your experience.
                </p>
              </div>
            )}

            {/* reviews list */}
            {reviews.length === 0 ? (
              <p style={{ fontSize: "1.4rem", color: "var(--ink-3)", textAlign: "center", padding: "16px 0" }}>No reviews yet. Be the first!</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                      <Ph kind="portrait-3" label={(r.author?.name || "U")[0]} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1.3rem" }}>{r.author?.name || "Anonymous"}</div>
                      <Stars value={r.rating} readonly />
                    </div>
                  </div>
                  {r.text && <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>{r.text}</p>}

                  {/* Seller reply — show if present */}
                  {r.sellerReply && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--surface)", borderRadius: "var(--r-md)", borderLeft: "3px solid var(--accent)" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", marginBottom: 3 }}>Seller reply</div>
                      <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{r.sellerReply}</p>
                    </div>
                  )}

                  {/* Reply form — seller/admin only, only if no reply yet */}
                  {isSeller && !r.sellerReply && (
                    replyingTo === r._id ? (
                      <div style={{ marginTop: 8 }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply…"
                          rows={2}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "1.2rem", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--white)", color: "var(--ink-1)", outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button className="btn btn-primary" style={{ flex: 1, padding: "6px 12px", fontSize: "1.2rem" }} onClick={() => submitReply(r._id)} disabled={replyLoading}>
                            {replyLoading ? <i className="fas fa-spinner fa-spin" /> : "Post reply"}
                          </button>
                          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "1.2rem" }} onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-ghost" style={{ marginTop: 6, fontSize: "1.1rem", padding: "4px 10px" }} onClick={() => { setReplyingTo(r._id); setReplyText(""); }}>
                        <i className="fas fa-reply" style={{ marginRight: 4 }} /> Reply as seller
                      </button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "qa" && (
          <div>
            {/* Ask a question */}
            {user ? (
              <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 10 }}>Ask the seller</div>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="What would you like to know about this product?"
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--white)", color: "var(--ink-1)", outline: "none" }}
                />
                <button className="btn btn-primary" style={{ marginTop: 8, width: "100%" }} onClick={submitQuestion} disabled={qaSubmitting || !newQuestion.trim()}>
                  {qaSubmitting ? <i className="fas fa-spinner fa-spin" /> : "Post question"}
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="fas fa-lock" style={{ color: "var(--ink-4)", fontSize: "1.4rem", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                  <button onClick={() => navigate("/login")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: 700, padding: 0 }}>Sign in</button> to ask the seller a question.
                </p>
              </div>
            )}

            {/* Questions list */}
            {qaLoading ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <i className="fas fa-spinner fa-spin" style={{ color: "var(--ink-4)", fontSize: "1.6rem" }} />
              </div>
            ) : questions.length === 0 ? (
              <p style={{ fontSize: "1.4rem", color: "var(--ink-3)", textAlign: "center", padding: "16px 0" }}>No questions yet. Be the first to ask!</p>
            ) : (
              questions.map((q) => (
                <div key={q._id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <i className="fas fa-circle-question" style={{ color: "var(--accent)", fontSize: "1.2rem", marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.5 }}>{q.question}</p>
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-4)", marginTop: 2 }}>
                        {q.asker?.name || "Anonymous"} · {new Date(q.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Answers */}
                  {q.answers?.length > 0 && q.answers.map((a, i) => (
                    <div key={i} style={{ marginLeft: 20, marginTop: 6, padding: "8px 12px", background: "var(--surface)", borderRadius: "var(--r-md)", borderLeft: "3px solid var(--accent)" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", marginBottom: 3 }}>Seller</div>
                      <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{a.answer}</p>
                    </div>
                  ))}

                  {/* Answer form — seller/admin only */}
                  {isSeller && (
                    answeringQ === q._id ? (
                      <div style={{ marginLeft: 20, marginTop: 8 }}>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Write your answer…"
                          rows={2}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "1.2rem", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--white)", color: "var(--ink-1)", outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button className="btn btn-primary" style={{ flex: 1, padding: "6px 12px", fontSize: "1.2rem" }} onClick={() => submitAnswer(q._id)} disabled={answerLoading}>
                            {answerLoading ? <i className="fas fa-spinner fa-spin" /> : "Post answer"}
                          </button>
                          <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "1.2rem" }} onClick={() => { setAnsweringQ(null); setAnswerText(""); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-ghost" style={{ marginLeft: 20, marginTop: 6, fontSize: "1.1rem", padding: "4px 10px" }} onClick={() => { setAnsweringQ(q._id); setAnswerText(""); }}>
                        <i className="fas fa-pen" style={{ marginRight: 4 }} /> Answer
                      </button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Meet the Seller */}
      {seller && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 12px" }}>Meet the Seller</h2>
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid var(--line)" }}>
                {logoUrl && !logoUrl.includes("guy.png")
                  ? <img src={logoUrl} alt={seller.storeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Ph kind="portrait-3" label={seller.storeName?.[0] || seller.name?.[0] || "S"} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {seller.storeName || seller.name}
                </div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>
                  {seller.followerCount || 0} follower{(seller.followerCount || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  padding: "6px 14px", borderRadius: "var(--r-pill)", flexShrink: 0,
                  border: following ? "1px solid var(--line)" : "1px solid var(--accent)",
                  background: following ? "var(--surface)" : "transparent",
                  color: following ? "var(--ink-2)" : "var(--accent)",
                  fontSize: "1.2rem", fontWeight: 700, cursor: followLoading ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {followLoading ? <i className="fas fa-spinner fa-spin" style={{ fontSize: "1rem" }} /> : following ? "Following" : "+ Follow"}
              </button>
            </div>
            {(seller.bio && seller.bio !== "No bio available") || (seller.description && seller.description !== "No seller story yet") ? (
              <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--line)" }}>
                <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.6, margin: "12px 0 0" }}>
                  {seller.bio !== "No bio available" ? seller.bio : seller.description}
                </p>
              </div>
            ) : null}
            {(seller.address || seller.location) && (
              <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "var(--ink-3)" }}>
                <i className="fas fa-location-dot" style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>{seller.address || seller.location}</span>
              </div>
            )}
            <div style={{ padding: "0 16px 14px" }}>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", justifyContent: "center", gap: 8 }}
                onClick={() => navigate(`/messages?with=${seller._id}&name=${encodeURIComponent(seller.storeName || seller.name || "Seller")}`)}
              >
                <i className="fas fa-comment" /> Message Seller
              </button>
            </div>
          </div>
        </div>
      )}

      {/* cart bar inline on desktop */}
      {isDesktop && (
        <>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
          {/* Qty stepper only appears once this item is actually in the cart —
              keeps the row clean and gives the price/button their full width before then. */}
          {!outOfStock && cartEntry && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-pill)", background: "var(--surface)", flexShrink: 0 }}>
              <button className="icon-btn" style={{ width: 30, height: 30, background: "var(--white)", borderRadius: 10 }} onClick={decrementCartEntry}>
                <i className="fas fa-minus" />
              </button>
              <span style={{ width: 28, textAlign: "center", fontWeight: 700 }}>{cartEntry.quantity}</span>
              <button className="icon-btn" style={{ width: 30, height: 30, background: "var(--white)", borderRadius: 10 }} onClick={incrementCartEntry} disabled={cartEntry.quantity >= totalStock}>
                <i className="fas fa-plus" />
              </button>
            </div>
          )}
          {cartEntry ? (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate("/cart")}>
              <i className="fas fa-check" /> In cart — {naira(displayPrice * cartEntry.quantity)}
            </button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1, opacity: outOfStock ? 0.6 : 1 }} onClick={handleAddToCart} disabled={cartLoading || outOfStock}>
              {cartLoading ? <i className="fas fa-spinner fa-spin" /> : outOfStock ? "Out of Stock" : <><i className="fas fa-bag-shopping" /> Add to cart — {naira(displayPrice * qty)}</>}
            </button>
          )}
        </div>
        {!outOfStock && seller && (
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 8, justifyContent: "center", gap: 8 }}
            onClick={() => setNegotiateOpen(true)}
          >
            <i className="fas fa-handshake" /> Negotiate price
          </button>
        )}
        {/* Restock alert — only when out of stock */}
        {outOfStock && (
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8, gap: 8 }} onClick={handleRestockAlert} disabled={restockLoading}>
            {restockLoading ? <i className="fas fa-spinner fa-spin" /> : restockSubscribed ? <><i className="fas fa-bell-slash" /> Remove restock alert</> : <><i className="fas fa-bell" /> Notify me when back in stock</>}
          </button>
        )}
        {/* Price watch — full button on desktop; icon-only in the mobile fixed bar below */}
        {isDesktop && (
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8, gap: 8, color: watchingPrice ? "var(--accent)" : undefined }} onClick={handleWatchPrice} disabled={watchLoading}>
            {watchLoading ? <i className="fas fa-spinner fa-spin" /> : watchingPrice ? <><i className="fas fa-eye-slash" /> Stop watching price</> : <><i className="fas fa-tag" /> Watch for price drop</>}
          </button>
        )}
        <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.22)", borderRadius: "var(--r-md)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <i className="fas fa-shield-halved" style={{ color: "#f59e0b", marginTop: 2, flexShrink: 0, fontSize: "1.2rem" }} />
          <p style={{ margin: 0, fontSize: "1.15rem", color: "var(--ink-2)", lineHeight: 1.55 }}>
            <strong>Pay only through UMP checkout</strong> — never send money directly to a seller's account. Off-campus pickups are at the buyer's own risk.
          </p>
        </div>
        </>
      )}
    </div>
  );

  return (
    <div className="page">
      <Navbar />

      {/* toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "calc(var(--nav-h-mob, 64px) + 12px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--navy-800, #1e293b)", color: "#fff", padding: "10px 20px",
          borderRadius: "var(--r-pill)", fontSize: "1.3rem", fontWeight: 600,
          zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.2)",
        }}>
          {toast}
        </div>
      )}

      <div className="page-inner" style={{ paddingTop: 8 }}>
        {isDesktop ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
            {gallery}
            {info}
          </div>
        ) : (
          <>
            {gallery}
            <div style={{ marginTop: 16 }}>{info}</div>
          </>
        )}

        {/* related */}
        {related.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 32 }}><h2>You might also like</h2></div>
            <div className="h-scroll">
              {related.map((rp) => (
                <div key={rp._id} className="product-card" style={{ width: 150, flexShrink: 0, cursor: "pointer" }} onClick={() => navigate(`/products/${rp._id}`)}>
                  <div className="product-thumb">
                    {getImageUrl(rp.images?.[0])
                      ? <img src={getImageUrl(rp.images?.[0])} alt={rp.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      : <Ph kind={rp.category?.name?.toLowerCase() || "default"} />}
                  </div>
                  <div className="product-meta">
                    <div className="product-name">{rp.name}</div>
                    <div className="product-price">{naira(rp.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Report link */}
        {product && (
          <div style={{ textAlign: "center", marginTop: 8, paddingBottom: 8 }}>
            <button
              onClick={() => setShowReport(true)}
              style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: "1.2rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <i className="fas fa-flag" style={{ fontSize: "1rem" }} /> Report this listing
            </button>
          </div>
        )}

        <div style={{ height: isDesktop ? 40 : 90 }} />
      </div>
      <Footer />

      {showReport && product && (
        <ReportModal
          refModel="Product"
          refId={product._id}
          refName={product.name}
          onClose={() => setShowReport(false)}
        />
      )}

      {negotiateOpen && product && seller && (
        <NegotiationModal
          itemType="Product"
          itemId={product._id}
          itemName={product.name}
          itemImage={product.images?.[0]?.url || null}
          originalPrice={product.price}
          sellerId={seller._id}
          onClose={() => setNegotiateOpen(false)}
        />
      )}

      {/* mobile-only fixed cart bar */}
      {!isDesktop && (
        <div style={{
          position: "fixed", left: 16, right: 16, bottom: 16,
          background: "var(--white)", border: "1px solid var(--line)",
          borderRadius: "var(--r-pill)", padding: 6,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "var(--shadow-pop)", zIndex: 40,
        }}>
          {/* Qty stepper only appears once this item is actually in the cart —
              keeps the bar uncluttered so the price stays readable before then. */}
          {!outOfStock && cartEntry && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", flexShrink: 0 }}>
              <button className="icon-btn" style={{ width: 32, height: 32, background: "var(--surface)", borderRadius: 12 }} onClick={decrementCartEntry}>
                <i className="fas fa-minus" />
              </button>
              <span style={{ width: 24, textAlign: "center", fontWeight: 700 }}>{cartEntry.quantity}</span>
              <button className="icon-btn" style={{ width: 32, height: 32, background: "var(--surface)", borderRadius: 12 }} onClick={incrementCartEntry} disabled={cartEntry.quantity >= totalStock}>
                <i className="fas fa-plus" />
              </button>
            </div>
          )}
          {!outOfStock && seller && (
            <button
              className="icon-btn"
              title="Negotiate price"
              style={{ flexShrink: 0 }}
              onClick={() => setNegotiateOpen(true)}
            >
              <i className="fas fa-handshake" />
            </button>
          )}
          <button
            className="icon-btn"
            title={watchingPrice ? "Stop watching price" : "Watch for price drop"}
            style={{ flexShrink: 0, color: watchingPrice ? "var(--accent)" : undefined }}
            onClick={handleWatchPrice}
            disabled={watchLoading}
          >
            {watchLoading
              ? <i className="fas fa-spinner fa-spin" />
              : watchingPrice
                ? <i className="fas fa-eye-slash" />
                : <i className="fas fa-tag" />
            }
          </button>
          {cartEntry ? (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate("/cart")}>
              <i className="fas fa-check" /> In cart — {naira(displayPrice * cartEntry.quantity)}
            </button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1, opacity: outOfStock ? 0.6 : 1 }} onClick={handleAddToCart} disabled={cartLoading || outOfStock}>
              {cartLoading ? <i className="fas fa-spinner fa-spin" /> : outOfStock ? "Out of Stock" : <><i className="fas fa-bag-shopping" /> Add — {naira(displayPrice * qty)}</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
