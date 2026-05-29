import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
function fmt12h(t) {
  if (!t) return t;
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function slotLabel(s) {
  if (typeof s === "string") return s;
  return `${s.day?.slice(0, 3)} ${fmt12h(s.startTime)}–${fmt12h(s.endTime)}`;
}

const PRICING_SUFFIX = {
  hourly:        "/hr",
  per_project:   "/project",
  starting_from: " from",
  fixed:         "",
};

function formatPrice(service) {
  if (service.pricingType === "negotiable") return { label: "Negotiable", sub: "", accent: false };
  if (service.pricingType === "free")       return { label: "Free",       sub: "", accent: false };
  const cur = service.currency === "USD" ? "$" : "₦";
  const amt = `${cur}${Number(service.rate || 0).toLocaleString()}`;
  const sub = PRICING_SUFFIX[service.pricingType] || "";
  return { label: amt, sub, accent: true };
}
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";
import ReportModal from "../components/ReportModal";

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [toast, setToast] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [activeImg, setActiveImg] = useState(0);   // must be here — before any early returns
  const toastTimer = useRef(null);

  const today = new Date().toISOString().split("T")[0];

  function showToast(msg, type = "success") {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    apiFetch(`/api/services/${id}`)
      .then((d) => setService(d.service || d || null))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!bookingDate || !id) return;
    apiFetch(`/api/bookings/booked-slots?itemId=${id}&date=${bookingDate}`)
      .then((d) => setBookedSlots(d.bookedSlots || []))
      .catch(() => setBookedSlots([]));
  }, [bookingDate, id]);

  async function handleShare() {
    const url = window.location.href;
    const title = service?.title || service?.name || "Service";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(url); showToast("Link copied!"); } catch { showToast("Could not copy link", "error"); }
    }
  }

  async function handleBook(e) {
    e.preventDefault();
    if (!selectedSlot) { showToast("Please select a time slot", "error"); return; }
    if (!bookingDate) { showToast("Please pick a date", "error"); return; }
    setBookingLoading(true);
    try {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: { itemId: id, itemType: "service", date: bookingDate, timeSlot: selectedSlot, notes: bookingNotes },
      });
      setBookingOpen(false);
      setSelectedSlot(null);
      setBookingDate("");
      setBookingNotes("");
      showToast("Booking confirmed! The provider will reach out soon.");
    } catch (err) {
      if (err?.status === 401) { showToast("Please sign in to book", "error"); setTimeout(() => navigate("/login"), 1500); }
      else showToast(err?.message || "Failed to book. Please try again.", "error");
      if (bookingDate) {
        apiFetch(`/api/bookings/booked-slots?itemId=${id}&date=${bookingDate}`)
          .then((d) => setBookedSlots(d.bookedSlots || []))
          .catch(() => { /* ignore */ });
      }
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return (
    <div className="page">
      <Navbar />
      <Skel.ServiceDetail />
    </div>
  );

  if (!service) return (
    <div className="page">
      <Navbar />
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <p style={{ fontSize: "1.6rem", color: "var(--ink-2)", marginBottom: 16 }}>Service not found.</p>
        <button className="btn btn-primary" onClick={() => navigate("/services")}>Back to Services</button>
      </div>
    </div>
  );

  const images = service.images || [];
  const imgUrl = images[activeImg]?.url || images[0]?.url || null;
  const providerName = service.provider?.serviceProviderInfo?.businessName || service.provider?.storeName || service.provider?.businessName || service.provider?.name || "Provider";
  const providerAvatar = service.provider?.avatar?.url || null;
  const slots = service.timeSlots?.length > 0 ? service.timeSlots.map(slotLabel) : [];
  const price = formatPrice(service);

  return (
    <div className="page">
      <Navbar />

      {/* ── Image gallery ── */}
      <div style={{ position: "relative", margin: "12px 16px 0", borderRadius: "var(--r-2xl)", overflow: "hidden", height: 240, background: "var(--surface)" }}>
        {imgUrl
          ? <img src={imgUrl} alt={service.title || service.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Ph kind={service.major?.toLowerCase() || "default"} label={service.major || ""} />}
        <button className="icon-btn" style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)" }} onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left" />
        </button>
        <button className="icon-btn" style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)" }} onClick={handleShare}>
          <i className="fa-solid fa-share-nodes" />
        </button>
        {images.length > 1 && (
          <span style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(15,23,42,.65)", color: "#fff", fontSize: "1.1rem", fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
            {activeImg + 1}/{images.length}
          </span>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
          {images.map((img, i) => (
            <div
              key={i}
              onClick={() => setActiveImg(i)}
              style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, cursor: "pointer", outline: i === activeImg ? "2.5px solid var(--accent)" : "none", outlineOffset: 2 }}
            >
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {service.video?.url && (
        <div style={{ margin: "12px 16px 0", borderRadius: "var(--r-xl)", overflow: "hidden", background: "#000" }}>
          <video src={service.video.url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 220, display: "block" }} />
        </div>
      )}

      {/* ── Info ── */}
      <div style={{ padding: "16px 16px 100px" }}>
        {service.major && <span className="chip outline" style={{ marginBottom: 8, display: "inline-block" }}>{service.major}</span>}
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 8px" }}>{service.title || service.name}</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: "2.4rem", fontWeight: 800, color: price.accent !== false ? "var(--accent)" : "var(--ink-1)" }}>
            {price.label}<span style={{ fontSize: "1.2rem", color: "var(--ink-3)", fontWeight: 500 }}>{price.sub}</span>
          </span>
          {(service.rating || 0) > 0 && (
            <div className="rating" style={{ fontSize: "1.4rem" }}>
              <i className="fa-solid fa-star star" /> {service.rating}
              <span className="count">({service.reviewsCount || 0})</span>
            </div>
          )}
        </div>

        {/* Short description */}
        {service.desc && (
          <p style={{ fontSize: "1.4rem", color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>{service.desc}</p>
        )}

        {/* Full about / long description */}
        {service.about && service.about !== service.desc && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px" }}>About this service</h3>
            <p style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{service.about}</p>
          </div>
        )}

        {/* Duration */}
        {service.duration && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.3rem", color: "var(--ink-2)", marginBottom: 12 }}>
            <i className="fas fa-clock" style={{ color: "var(--accent)" }} />
            <span>Duration: <strong>{service.duration}</strong></span>
          </div>
        )}

        {/* Provider card */}
        {service.provider && (
          <div style={{ padding: 14, border: "1px solid var(--line)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
              {providerAvatar
                ? <img src={providerAvatar} alt={providerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Ph kind="portrait-1" label={providerName[0]} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: "1.4rem" }}>{providerName}</strong>
                {service.verified && <i className="fas fa-crown" style={{ color: "#f59e0b", fontSize: "1.1rem" }} />}
              </div>
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Service provider</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/messages?with=${service.provider?._id || service.provider}&name=${encodeURIComponent(providerName)}`)}>
              <i className="fa-solid fa-comment" /> Chat
            </button>
          </div>
        )}

        {/* Time slots */}
        {slots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 10px" }}>Availability</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {slots.map((label, i) => (
                <span key={`slot-${i}`} className="chip"><i className="fas fa-clock" style={{ marginRight: 5, fontSize: "0.95rem" }} />{label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio links */}
        {service.portfolio?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px" }}>Portfolio</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {service.portfolio.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noreferrer" style={{ fontSize: "1.25rem", color: "var(--accent)", wordBreak: "break-all" }}>
                  <i className="fas fa-link" style={{ marginRight: 6 }} />{link}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {service.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {service.tags.map((tag) => (
              <span key={tag} className="chip outline" style={{ fontSize: "1.1rem" }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Report */}
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <button onClick={() => setShowReport(true)} style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: "1.15rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            <i className="fa-solid fa-flag" style={{ marginRight: 4 }} />Report this service
          </button>
        </div>
      </div>

      <Footer />

      {showReport && service && (
        <ReportModal
          refModel="Service"
          refId={service._id}
          refName={service.title || service.name}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Sticky book bar */}
      <div style={{ position: "fixed", left: 16, right: 16, bottom: 16, background: "var(--white)", border: "1px solid var(--line)", borderRadius: "var(--r-pill)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-pop)", zIndex: 40 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: price.accent !== false ? "var(--accent)" : "var(--ink-1)" }}>
            {price.label}<span style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 500 }}>{price.sub}</span>
          </div>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: "var(--r-pill)" }} onClick={() => setBookingOpen(true)}>
          <i className="fa-solid fa-calendar-check" /> Book session
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : "#22c55e", color: "#fff", padding: "10px 20px", borderRadius: "var(--r-pill)", fontSize: "1.3rem", fontWeight: 600, zIndex: 200, whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Booking modal */}
      {bookingOpen && (
        <>
          <div onClick={() => setBookingOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 70 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--white)", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", zIndex: 80, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Book a session</h3>
              <button className="icon-btn" onClick={() => { setBookingOpen(false); setSelectedSlot(null); setBookingDate(""); }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div className="label" style={{ marginBottom: 8 }}>Pick a date</div>
            <input
              type="date"
              className="input"
              min={today}
              value={bookingDate}
              onChange={(e) => { setBookingDate(e.target.value); setSelectedSlot(null); }}
              style={{ marginBottom: 16 }}
            />

            <div className="label" style={{ marginBottom: 8 }}>Select time slot</div>
            {slots.length === 0 && (
              <p style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 16 }}>This provider hasn't set availability slots — contact them to arrange a time.</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {slots.map((label, i) => {
                const taken = bookedSlots.includes(label);
                return (
                  <span
                    key={`bslot-${i}`}
                    className={`chip${selectedSlot === label ? " active" : ""}`}
                    style={{
                      cursor: taken ? "not-allowed" : "pointer",
                      opacity: taken ? 0.45 : 1,
                      textDecoration: taken ? "line-through" : "none",
                      pointerEvents: taken ? "none" : "auto",
                    }}
                    onClick={() => !taken && setSelectedSlot(label)}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            <form onSubmit={handleBook}>
              <div className="label" style={{ marginBottom: 8 }}>Notes (optional)</div>
              <textarea
                className="textarea"
                placeholder="What would you like to cover?"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bookingLoading}>
                {bookingLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Confirm booking"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
