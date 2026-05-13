import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import Skel from "../components/Skel";

const ROOM_TYPES = ["All", "Apartment", "Hostel"];
const AMENITY_ICONS = {
  "WiFi": "wifi", "Water": "droplet", "Electricity": "bolt",
  "Kitchen": "utensils", "Bathroom": "shower", "Parking": "car",
  "Security": "shield-halved", "Laundry": "shirt", "AC": "snowflake", "Generator": "plug",
};

function getImageUrl(img) {
  if (!img) return null;
  if (typeof img === "string") return img;
  return img.url || null;
}

export default function Hostel() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { listingIds, toggleListing } = useWishlist();
  const [filter, setFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function toggleSave(e, listing) {
    e.stopPropagation();
    const id = listing._id;
    const wasSaved = listingIds.has(id);
    setSavingId(id);
    try {
      await toggleListing(id);
      showToast(wasSaved ? "Removed from saved" : "Saved to favourites", wasSaved ? "info" : "success");
    } catch {
      showToast("Sign in to save listings", "warn");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    apiFetch("/api/listings")
      .then((d) => setListings(d.listings || d || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = listings.filter((l) => {
    if (filter !== "All") {
      const typeMatch = (l.type || "").toLowerCase().replace(/\s+/g, "-") === filter.toLowerCase().replace(/\s+/g, "-");
      if (!typeMatch) return false;
    }
    if (minPrice && (l.price || 0) < Number(minPrice)) return false;
    if (maxPrice && (l.price || 0) > Number(maxPrice)) return false;
    if (furnished) {
      const amenities = (l.amenities || []).map((a) => a.toLowerCase());
      const desc = (l.description || l.name || "").toLowerCase();
      if (!l.furnished && !amenities.includes("furnished") && !desc.includes("furnished")) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <Navbar />
      <div className="page-inner">
        <div style={{ padding: "12px 0 0" }}>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 4px" }}>Your room, your rules.</h1>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.3rem" }}>Off-campus stays around UNILAG.</p>
        </div>

        <div style={{ padding: "12px 0 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {ROOM_TYPES.map((t) => (
            <span key={t} className={`chip${filter === t ? " active" : ""}`} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setFilter(t)}>{t}</span>
          ))}
        </div>

        {/* Price range + furnished toggle */}
        <div style={{ padding: "10px 0 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            type="number"
            placeholder="Min price (₦)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: 130, height: 40, flexShrink: 0 }}
          />
          <input
            className="input"
            type="number"
            placeholder="Max price (₦)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: 130, height: 40, flexShrink: 0 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.3rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={furnished}
              onChange={(e) => setFurnished(e.target.checked)}
            />
            Furnished
          </label>
        </div>

        <div className="hostel-listing-grid" style={{ padding: "16px 0 24px" }}>
          {loading
            ? [1, 2, 3].map((i) => <Skel.HostelCard key={i} />)
            : visible.length === 0
            ? (
                <div className="empty-state">
                  <i className="fas fa-bed" />
                  <h3>No rooms found</h3>
                  <p>{filter !== "All" ? `No "${filter}" listings yet` : "No listings near UNILAG yet — be the first to post"}</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate("/partner")}>Post a listing</button>
                </div>
              )
            : visible.map((h, i) => (
                <div key={h._id || i} className="card" style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/hostel/${h._id}`)}>
                  <div style={{ height: 180, position: "relative", background: "var(--surface)" }}>
                    {(() => {
                      const imgUrl = getImageUrl(h.images?.[0]);
                      return imgUrl
                        ? <img src={imgUrl} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                        : null;
                    })()}
                    <Ph kind={`hostel-${(i % 3) + 1}`} label="hostel" style={{ display: getImageUrl(h.images?.[0]) ? "none" : undefined }} />
                    <span className="product-tag" style={{ background: "rgba(15,23,42,.85)" }}>{h.type || "Room"}</span>
                    <button
                      className={`product-fav${listingIds.has(h._id) ? " faved" : ""}`}
                      onClick={(e) => toggleSave(e, h)}
                      disabled={savingId === h._id}
                    >
                      {savingId === h._id
                        ? <i className="fas fa-spinner fa-spin" style={{ fontSize: "1rem" }} />
                        : <i className={`${listingIds.has(h._id) ? "fas" : "far"} fa-heart`} />}
                    </button>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>{h.name}</h3>
                      <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{naira(h.price)}</span>
                    </div>
                    <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 4 }}>
                      <i className="fas fa-location-dot" /> {h.location}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      {(h.amenities || []).slice(0, 4).map((a) => (
                        <span key={a} title={a} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}>
                          <i className={`fas fa-${AMENITY_ICONS[a] || "check"}`} />
                        </span>
                      ))}
                      <span style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{h.rate || "per year"}</span>
                      <button className="btn btn-sm btn-dark" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); navigate(`/hostel/${h._id}`); }}>View</button>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
