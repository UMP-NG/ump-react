import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import ProductCard from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import useReveal from "../hooks/useReveal";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import Skel from "../components/Skel";
import ReportModal from "../components/ReportModal";

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const showToast = useToast();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useReveal(".product-card", [seller?.products?.length]);

  useEffect(() => {
    apiFetch(`/api/sellers/${id}`)
      .then((d) => {
        const s = d.seller || d;
        setSeller(s);
        // Use server-computed isFollowing when available; fall back to scanning followers array
        if (typeof s.isFollowing === "boolean") {
          setFollowing(s.isFollowing);
        } else if (user) {
          const followers = s.followers || [];
          setFollowing(followers.some((f) => (f._id || f).toString() === (user._id || user.id).toString()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) return (
    <div className="page">
      <Navbar />
      <Skel.StoreDetail />
    </div>
  );

  if (!seller) return (
    <div className="page">
      <Navbar />
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <i className="fas fa-store-slash" style={{ fontSize: "3rem", color: "var(--ink-3)" }} />
        <p style={{ marginTop: 12, color: "var(--ink-2)", fontSize: "1.4rem" }}>Store not found</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate("/store")}>Back to stores</button>
      </div>
    </div>
  );

  const avatar = seller.logo?.url || seller.avatar?.url || seller.user?.avatar?.url || null;
  const banner = seller.banner?.url || null;
  const products = seller.products || [];

  async function toggleFollow() {
    if (!user) { navigate("/login"); return; }
    const storeOwner = seller.user?._id || seller.user;
    const myId = user._id || user.id;
    if (storeOwner && storeOwner.toString() === myId?.toString()) {
      showToast("You can't follow your own store", "warn");
      return;
    }
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setSeller((prev) => ({
      ...prev,
      followersCount: (prev.followersCount || 0) + (wasFollowing ? -1 : 1),
    }));
    try {
      const res = await apiFetch(`/api/sellers/${id}/${wasFollowing ? "unfollow" : "follow"}`, { method: "POST" });
      // Reconcile with authoritative server state
      const serverFollowing = typeof res.following === "boolean" ? res.following : !wasFollowing;
      setFollowing(serverFollowing);
      if (typeof res.followersCount === "number") {
        setSeller((prev) => ({ ...prev, followersCount: res.followersCount }));
      }
      showToast(serverFollowing ? "Following store!" : "Unfollowed store", "success");
    } catch (err) {
      // Roll back optimistic update on failure
      setFollowing(wasFollowing);
      setSeller((prev) => ({
        ...prev,
        followersCount: (prev.followersCount || 0) + (wasFollowing ? 1 : -1),
      }));
      showToast(err.message || "Action failed", "error");
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div className="page">
      <Navbar />

      {/* Banner */}
      <div style={{ position: "relative", height: 160, background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", overflow: "hidden" }}>
        {banner
          ? <img src={banner} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Ph kind="campus" label="" />}
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.35)" }} />
      </div>

      {/* Avatar — overlaps bottom of banner */}
      <div style={{ padding: "0 16px", marginTop: -36, position: "relative", zIndex: 2 }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", background: "var(--surface)", boxShadow: "0 0 0 3px var(--paper), 0 4px 12px rgba(0,0,0,.18)" }}>
          {avatar
            ? <img src={avatar} alt={seller.storeName || seller.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <Ph kind="portrait-1" label={(seller.storeName || seller.name || "S")[0]} />}
        </div>

        {/* Name + category — clearly below banner */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{seller.storeName || seller.name}</h1>
              {seller.isVerified && <i className="fas fa-circle-check" style={{ color: "var(--accent)", fontSize: "1.4rem" }} title="Verified by UMP" />}
            </div>
            {seller.category?.length > 0 && (
              <p style={{ margin: "2px 0 0", fontSize: "1.2rem", color: "var(--ink-3)" }}>{seller.category.join(" · ")}</p>
            )}
          </div>
          <button
            className={`btn btn-sm${following ? " btn-ghost" : " btn-primary"}`}
            style={{ flexShrink: 0 }}
            disabled={followLoading}
            onClick={toggleFollow}
          >
            {followLoading
              ? <i className="fas fa-spinner fa-spin" />
              : following
                ? <><i className="fas fa-user-check" /> Following</>
                : <><i className="fas fa-user-plus" /> Follow</>}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
          {seller.rating > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{Number(seller.rating).toFixed(1)}</div>
              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Rating</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{seller.totalOrders || 0}</div>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Sales</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{seller.followersCount || 0}</div>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Followers</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{products.length}</div>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Listings</div>
          </div>
        </div>

        {/* Bio */}
        {(seller.bio || seller.description) && (
          <p style={{ margin: "14px 0 0", fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
            {seller.bio || seller.description}
          </p>
        )}
      </div>

      {/* Report link */}
      <div style={{ padding: "0 16px 4px", textAlign: "right" }}>
        <button
          onClick={() => setShowReport(true)}
          style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: "1.15rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          <i className="fas fa-flag" style={{ marginRight: 4 }} />Report this store
        </button>
      </div>

      {/* Products */}
      <div style={{ padding: "24px 16px 0" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: "1.8rem", fontWeight: 800 }}>
          Listings <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({products.length})</span>
        </h2>

        {products.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-3)", fontSize: "1.4rem" }}>
            No listings yet
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, paddingBottom: 32 }}>
            {products.map((p) => (
              <ProductCard key={p._id} product={p} variant="hover" onAddToCart={() => {}} />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <BottomNav />

      {showReport && (
        <ReportModal
          refModel="Seller"
          refId={seller._id}
          refName={seller.storeName || seller.name}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
