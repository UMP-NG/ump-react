import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";
import ReportModal from "../components/ReportModal";

const TABS = [
  { key: "description",  label: "Description" },
  { key: "specs",        label: "Specifications" },
  { key: "reviews",      label: "Reviews" },
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
  const [product, setProduct]   = useState(null);
  const [tab, setTab]           = useState("description");
  const [showReport, setShowReport] = useState(false);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
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
  const [toast, setToast] = useState("");
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const toastTimer = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/products/${id}`)
      .then((d) => {
        const p = d.product || d;
        setProduct(p);
        setFollowing(p.seller?.isFollowing || false);
        return Promise.all([
          apiFetch(`/api/products?limit=6`),
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

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  async function handleFollow() {
    setFollowLoading(true);
    try {
      if (following) {
        await apiFetch(`/api/follows/${product.seller._id}`, { method: "DELETE" });
        setFollowing(false);
      } else {
        await apiFetch(`/api/follows/${product.seller._id}`, { method: "POST" });
        setFollowing(true);
      }
    } catch (err) {
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
      try { await navigator.share({ title, url }); } catch {}
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
    setCartLoading(true);
    try {
      await apiFetch("/api/cart/add", { method: "POST", body: { productId: id, quantity: qty } });
      navigate("/cart");
    } catch {
      navigate("/login");
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
  const hasSpecs = product.specs && Object.keys(product.specs).length > 0;
  const logoUrl = typeof seller?.logo === "string" ? seller.logo : seller?.logo?.url;
  const variantStock = Array.isArray(product.variants) ? product.variants.reduce((s, v) => s + (v.stock || 0), 0) : 0;
  const totalStock = (product.stock || 0) + variantStock;
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;

  const gallery = (
    <div>
      <div style={{ borderRadius: isDesktop ? "var(--r-2xl)" : "var(--r-lg)", overflow: "hidden", background: "var(--surface)", position: "relative", aspectRatio: "4/3" }}>
        {imgSrc
          ? <img src={imgSrc} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <Ph kind={categorySlug} />}

        {/* back / share / heart overlaid on image */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", zIndex: 5 }}>
          <button className="icon-btn" style={{ background: "rgba(255,255,255,.92)", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }} onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" style={{ background: "rgba(255,255,255,.92)", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }} onClick={handleShare}>
              <i className="fas fa-share-nodes" />
            </button>
            <button className="icon-btn" style={{ background: "rgba(255,255,255,.92)", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.12)", color: wishlisted ? "#ef4444" : undefined }} onClick={handleWishlist} disabled={wishlistLoading}>
              {wishlistLoading
                ? <i className="fas fa-spinner fa-spin" style={{ fontSize: "1rem" }} />
                : <i className={wishlisted ? "fas fa-heart" : "far fa-heart"} />}
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
        <div style={{ fontSize: "2.8rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>{naira(product.price)}</div>
        {outOfStock && (
          <span style={{ padding: "4px 12px", borderRadius: "var(--r-pill)", background: "#f3f4f6", color: "#6b7280", fontSize: "1.2rem", fontWeight: 700 }}>Out of Stock</span>
        )}
        {lowStock && (
          <span style={{ padding: "4px 12px", borderRadius: "var(--r-pill)", background: "#fef3c7", color: "#d97706", fontSize: "1.2rem", fontWeight: 700 }}>
            <i className="fas fa-triangle-exclamation" style={{ marginRight: 4 }} />Only {totalStock} left!
          </span>
        )}
      </div>

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
            {/* write a review */}
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
          {!outOfStock && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-pill)", background: "var(--surface)" }}>
              <button className="icon-btn" style={{ width: 30, height: 30, background: "var(--white)", borderRadius: 10 }} onClick={() => setQty(Math.max(1, qty - 1))}>
                <i className="fas fa-minus" />
              </button>
              <span style={{ width: 28, textAlign: "center", fontWeight: 700 }}>{qty}</span>
              <button className="icon-btn" style={{ width: 30, height: 30, background: "var(--white)", borderRadius: 10 }} onClick={() => setQty(Math.min(totalStock, qty + 1))}>
                <i className="fas fa-plus" />
              </button>
            </div>
          )}
          <button className="btn btn-primary" style={{ flex: 1, opacity: outOfStock ? 0.6 : 1 }} onClick={handleAddToCart} disabled={cartLoading || outOfStock}>
            {cartLoading ? <i className="fas fa-spinner fa-spin" /> : outOfStock ? "Out of Stock" : <><i className="fas fa-bag-shopping" /> Add to cart — {naira(product.price * qty)}</>}
          </button>
        </div>
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

      {/* mobile-only fixed cart bar */}
      {!isDesktop && (
        <div style={{
          position: "fixed", left: 16, right: 16, bottom: 16,
          background: "var(--white)", border: "1px solid var(--line)",
          borderRadius: "var(--r-pill)", padding: 6,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "var(--shadow-pop)", zIndex: 40,
        }}>
          {!outOfStock && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px" }}>
              <button className="icon-btn" style={{ width: 32, height: 32, background: "var(--surface)", borderRadius: 12 }} onClick={() => setQty(Math.max(1, qty - 1))}>
                <i className="fas fa-minus" />
              </button>
              <span style={{ width: 32, textAlign: "center", fontWeight: 700 }}>{qty}</span>
              <button className="icon-btn" style={{ width: 32, height: 32, background: "var(--surface)", borderRadius: 12 }} onClick={() => setQty(Math.min(totalStock, qty + 1))}>
                <i className="fas fa-plus" />
              </button>
            </div>
          )}
          <button className="btn btn-primary" style={{ flex: 1, opacity: outOfStock ? 0.6 : 1 }} onClick={handleAddToCart} disabled={cartLoading || outOfStock}>
            {cartLoading ? <i className="fas fa-spinner fa-spin" /> : outOfStock ? "Out of Stock" : <><i className="fas fa-bag-shopping" /> Add — {naira(product.price * qty)}</>}
          </button>
        </div>
      )}
    </div>
  );
}
