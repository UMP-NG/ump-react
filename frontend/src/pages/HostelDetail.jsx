import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import Skel from "../components/Skel";
import ReportModal from "../components/ReportModal";

const AMENITY_ICONS = {
  "WiFi": "wifi", "Water": "droplet", "Electricity": "bolt",
  "Kitchen": "utensils", "Bathroom": "shower", "Parking": "car",
  "Security": "shield-halved", "Laundry": "shirt", "AC": "snowflake", "Generator": "plug",
};

export default function HostelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [booking, setBooking] = useState({ name: "", phone: "", message: "", date: "" });
  const [booking_loading, setBookingLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/listings/${id}`),
      apiFetch("/api/listings?limit=4"),
    ]).then(([detail, all]) => {
      setListing(detail.listing || detail || null);
      setRelated((all.listings || all || []).filter((l) => l._id !== id).slice(0, 3));
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [id]);

  async function handleBook(e) {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await apiFetch("/api/bookings", { method: "POST", body: { listingId: id, ...booking } });
      setBookingOpen(false);
      showToast("Booking request sent! The landlord will contact you shortly.", "success");
    } catch {
      showToast("Failed to send booking. Please try again.", "error");
    } finally {
      setBookingLoading(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: listing?.name || "Hostel listing", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast("Link copied to clipboard", "success")).catch(() => showToast("Could not copy link", "error"));
    }
  }

  function toggleSaved() {
    setSaved((s) => !s);
    showToast(saved ? "Removed from saved" : "Saved to favourites", saved ? "info" : "success");
  }

  if (loading) return (
    <div className="page">
      <div style={{ position: "sticky", top: 0, zIndex: 50, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(250,250,247,.85)", backdropFilter: "blur(12px)" }}>
        <Skel w={40} h={40} r={12} />
        <div style={{ display: "flex", gap: 8 }}><Skel w={40} h={40} r={12} /><Skel w={40} h={40} r={12} /></div>
      </div>
      <Skel.HostelDetail />
    </div>
  );
  if (!listing) return (
    <div className="page">
      <Navbar />
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontSize: "1.6rem", color: "var(--ink-2)" }}>Listing not found.</p>
        <button className="btn btn-primary" onClick={() => navigate("/hostel")}>Back to Hostel Hub</button>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ position: "sticky", top: 0, zIndex: 50, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(250,250,247,.85)", backdropFilter: "blur(12px)" }}>
        <button className="icon-btn" style={{ background: "var(--white)", border: "1px solid var(--line)" }} onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" style={{ background: "var(--white)", border: "1px solid var(--line)" }} onClick={handleShare}><i className="fas fa-share-nodes" /></button>
          <button className="icon-btn" style={{ background: "var(--white)", border: "1px solid var(--line)" }} onClick={toggleSaved}>
            <i className={`${saved ? "fas" : "far"} fa-heart`} style={{ color: saved ? "#ef4444" : undefined }} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div style={{ position: "relative", margin: "0 16px", borderRadius: "var(--r-2xl)", overflow: "hidden", height: 260, background: "var(--surface)" }}>
        {listing.images?.length > 0
          ? <img src={listing.images[activeImg].url} alt={listing.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Ph kind="hostel-1" label="hostel" />
        }
        <span className="product-tag" style={{ background: "rgba(15,23,42,.85)" }}>{listing.type || "Room"}</span>
        {listing.images?.length > 1 && (
          <>
            <button onClick={() => setActiveImg((i) => (i - 1 + listing.images.length) % listing.images.length)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(15,23,42,.65)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}><i className="fas fa-chevron-left" /></button>
            <button onClick={() => setActiveImg((i) => (i + 1) % listing.images.length)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(15,23,42,.65)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}><i className="fas fa-chevron-right" /></button>
            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
              {listing.images.map((_, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{ width: activeImg === i ? 20 : 6, height: 6, borderRadius: 3, border: "none", padding: 0, cursor: "pointer", background: activeImg === i ? "#fff" : "rgba(255,255,255,.5)", transition: "width .25s" }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Video tour */}
      {listing.videos?.length > 0 && (
        <div style={{ margin: "12px 16px 0" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}><i className="fas fa-video" style={{ marginRight: 6, color: "var(--accent)" }} />Video tour</div>
          <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: "var(--r-xl)", maxHeight: 220, background: "#000" }}>
              <source src={listing.videos[0].url} type="video/mp4" />
            </video>
        </div>
      )}

      {/* Info */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", flex: 1 }}>{listing.name}</h1>
          <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--accent)", flexShrink: 0, marginLeft: 12 }}>{naira(listing.price)}<span style={{ fontSize: "1.2rem", color: "var(--ink-3)", fontWeight: 500 }}> {listing.rate || "/ yr"}</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: "1.3rem", marginBottom: 16 }}>
          <i className="fas fa-location-dot" /> {listing.location || listing.address}
        </div>

        {/* Amenities */}
        {listing.amenities?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {listing.amenities.map((a) => (
              <span key={a} className="chip" style={{ gap: 6 }}>
                <i className={`fas fa-${AMENITY_ICONS[a] || "check"}`} /> {a}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <p style={{ fontSize: "1.4rem", color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>{listing.description}</p>
        )}

        {/* Move-in cost breakdown — only shown if any extra fees are set */}
        {(listing.agreementFee > 0 || listing.commissionFee > 0 || listing.agentFee > 0 || listing.cautionFee > 0) && (() => {
          const naira = (n) => `₦${Number(n).toLocaleString()}`;
          const fees = [
            { label: "Rent", amount: listing.price },
            listing.agreementFee  > 0 && { label: "Agreement fee",  amount: listing.agreementFee },
            listing.commissionFee > 0 && { label: "Commission fee", amount: listing.commissionFee },
            listing.agentFee      > 0 && { label: "Agent fee",      amount: listing.agentFee },
            listing.cautionFee    > 0 && { label: "Caution fee",    amount: listing.cautionFee },
          ].filter(Boolean);
          const total = fees.reduce((s, f) => s + f.amount, 0);
          return (
            <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "10px 14px", background: "var(--surface)", borderBottom: "1px solid var(--line)", fontSize: "1.2rem", fontWeight: 700, letterSpacing: ".04em", color: "var(--ink-2)" }}>
                MOVE-IN COST BREAKDOWN
              </div>
              <div style={{ padding: "12px 14px" }}>
                {fees.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: i < fees.length - 1 ? 8 : 0, color: f.label === "Rent" ? "var(--ink-1)" : "var(--ink-2)" }}>
                    <span>{f.label}</span>
                    <span style={{ fontWeight: 600 }}>{naira(f.amount)}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.5rem", fontWeight: 800 }}>
                  <span>Total move-in</span>
                  <span style={{ color: "var(--accent)" }}>{naira(total)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Agent / Owner */}
        {listing.owner && (
          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden" }}><Ph kind="portrait-3" label={(listing.owner.name || "O")[0]} /></div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "1.4rem" }}>{listing.owner.name}</strong>
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Landlord · UNILAG area</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate("/messages")}><i className="fas fa-comment" /> Chat</button>
          </div>
        )}

        {/* Report link */}
        <div style={{ textAlign: "right", marginBottom: 8 }}>
          <button
            onClick={() => setShowReport(true)}
            style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: "1.15rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            <i className="fas fa-flag" style={{ marginRight: 4 }} />Report this listing
          </button>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <>
            <h3 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "20px 0 12px" }}>Similar listings</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {related.map((r) => (
                <div key={r._id} className="card" style={{ padding: 12, display: "flex", gap: 12, cursor: "pointer" }} onClick={() => navigate(`/hostel/${r._id}`)}>
                  <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                    {r.images?.[0]?.url
                      ? <img src={r.images[0].url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Ph kind="hostel-2" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>{r.location}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>{naira(r.price)} <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--ink-3)" }}>{r.rate || "/ yr"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />

      {showReport && (
        <ReportModal
          refModel="Listing"
          refId={listing._id}
          refName={listing.name}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* sticky book bar */}
      <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, background: "var(--white)", border: "1px solid var(--line)", borderRadius: "var(--r-pill)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-pop)", zIndex: 40 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>{naira(listing.price)}<span style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 500 }}> {listing.rate || "/ year"}</span></div>
        </div>
        <button className="btn btn-primary" onClick={() => setBookingOpen(true)}>
          <i className="fas fa-calendar-check" /> Schedule viewing
        </button>
      </div>

      {/* Booking modal */}
      {bookingOpen && (
        <>
          <div onClick={() => setBookingOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 70 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", zIndex: 80, animation: "fadeUp .25s" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.8rem", fontWeight: 800 }}>Schedule a viewing</h3>
            <form onSubmit={handleBook}>
              <div className="label">Your name</div>
              <input className="input" value={booking.name} onChange={(e) => setBooking({ ...booking, name: e.target.value })} required />
              <div style={{ height: 12 }} />
              <div className="label">Phone number</div>
              <input className="input" value={booking.phone} onChange={(e) => setBooking({ ...booking, phone: e.target.value })} required />
              <div style={{ height: 12 }} />
              <div className="label">Preferred date</div>
              <input className="input" type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} required />
              <div style={{ height: 12 }} />
              <div className="label">Message (optional)</div>
              <textarea className="textarea" placeholder="Any specific questions for the landlord?" value={booking.message} onChange={(e) => setBooking({ ...booking, message: e.target.value })} />
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={booking_loading} style={{ marginTop: 16 }}>
                {booking_loading ? <i className="fas fa-spinner fa-spin" /> : "Send request"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
