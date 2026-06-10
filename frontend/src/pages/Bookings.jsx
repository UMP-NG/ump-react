import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { naira } from "../components/ProductCard";

const STATUS_COLOR = {
  pending:   { bg: "rgba(245,158,11,.1)",  color: "#d97706" },
  confirmed: { bg: "rgba(59,130,246,.1)",  color: "#2563eb" },
  completed: { bg: "rgba(34,197,94,.1)",   color: "#16a34a" },
  rejected:  { bg: "rgba(239,68,68,.1)",   color: "#dc2626" },
  cancelled: { bg: "rgba(107,114,128,.1)", color: "#6b7280" },
};

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.pending;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.15rem", fontWeight: 700, background: s.bg, color: s.color }}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

// booking.item is the populated Service or Listing document
// booking.itemModel is "Service" or "Listing"
function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  const refId = booking.item?._id;
  const refModel = booking.itemModel; // "Service" or "Listing"
  const itemTitle = booking.item?.title || booking.item?.name || "this service";

  async function submit(e) {
    e.preventDefault();
    if (!rating) { showToast("Please select a star rating", "warn"); return; }
    setSaving(true);
    try {
      await apiFetch("/api/reviews", { method: "POST", body: { refModel, refId, rating, text } });
      showToast("Review submitted!", "success");
      onDone(booking._id);
      onClose();
    } catch (err) {
      showToast(err?.message || "Failed to submit review", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 440, width: "100%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "1.7rem" }}>Leave a Review</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.8rem", color: "var(--ink-3)" }}><i className="fas fa-xmark" /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 20 }}>
          <div style={{ fontSize: "1.3rem", color: "var(--ink-2)", marginBottom: 14 }}>
            Rate your experience with <strong>{itemTitle}</strong>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2.2rem", color: n <= rating ? "#f59e0b" : "var(--ink-4)", padding: "0 2px" }}>
                <i className={n <= rating ? "fas fa-star" : "far fa-star"} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience (optional)…"
            rows={3}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--white)", color: "var(--ink-1)", outline: "none" }}
          />
          <button className="btn btn-primary" type="submit" style={{ marginTop: 14, width: "100%" }} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Bookings() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [completing, setCompleting] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());

  useEffect(() => {
    apiFetch("/api/bookings/me")
      .then((d) => setBookings(d.bookings || (Array.isArray(d) ? d : [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markComplete(booking) {
    setCompleting(booking._id);
    try {
      const res = await apiFetch(`/api/bookings/${booking._id}/complete`, { method: "PUT" });
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "completed", ...(res.booking || {}) } : b));
      showToast("Booking marked as completed", "success");
    } catch (err) {
      showToast(err?.message || "Failed to complete booking", "error");
    } finally {
      setCompleting(null);
    }
  }

  const STATUS_FILTERS = ["All", "Pending", "Confirmed", "Completed", "Rejected"];
  const filtered = filter === "All" ? bookings : bookings.filter((b) => b.status === filter.toLowerCase());

  // booking.item is the populated Service/Listing; booking.itemModel tells us which
  const itemName = (b) => b.item?.title || b.item?.name || "Service";
  const providerName = (b) => b.provider?.name || b.provider?.businessName || "Provider";
  const itemRate = (b) => b.negotiatedRate ?? b.item?.rate ?? 0;

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48, maxWidth: 700 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, margin: "0 0 4px" }}>My Bookings</h1>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "2.5rem", color: "var(--accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <i className="fas fa-calendar-xmark" style={{ fontSize: "3rem", color: "var(--ink-4)", marginBottom: 12 }} />
            <p style={{ color: "var(--ink-2)", fontSize: "1.4rem" }}>No {filter !== "All" ? filter.toLowerCase() + " " : ""}bookings yet</p>
            <button className="btn btn-primary" onClick={() => navigate("/services")} style={{ marginTop: 12 }}>Browse services</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((b) => {
              const rate = itemRate(b);
              return (
                <div key={b._id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{itemName(b)}</div>
                      <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>with {providerName(b)}</div>
                    </div>
                    <StatusPill status={b.status} />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: "1.2rem", color: "var(--ink-2)", marginBottom: 10 }}>
                    <span><i className="fas fa-calendar" style={{ marginRight: 4, color: "var(--accent)" }} />{b.date ? new Date(b.date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                    {b.timeSlot && <span><i className="fas fa-clock" style={{ marginRight: 4, color: "var(--accent)" }} />{b.timeSlot}</span>}
                    {rate > 0 && <span><i className="fas fa-money-bill" style={{ marginRight: 4, color: "var(--accent)" }} />{naira(rate)}</span>}
                  </div>

                  {b.notes && <p style={{ margin: "0 0 10px", fontSize: "1.2rem", color: "var(--ink-3)", fontStyle: "italic" }}>{b.notes}</p>}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {b.status === "confirmed" && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => markComplete(b)}
                        disabled={completing === b._id}
                      >
                        {completing === b._id ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Mark as Completed</>}
                      </button>
                    )}
                    {b.status === "completed" && !reviewed.has(b._id) && b.item && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setReviewFor(b)}>
                        <i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 4 }} /> Leave a Review
                      </button>
                    )}
                    {reviewed.has(b._id) && (
                      <span style={{ fontSize: "1.2rem", color: "#16a34a" }}><i className="fas fa-check" style={{ marginRight: 4 }} />Review submitted</span>
                    )}
                    {b.itemModel === "Service" && b.item?._id && (
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/services/${b.item._id}`)}>
                        View Service
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewFor && (
        <ReviewModal
          booking={reviewFor}
          onClose={() => setReviewFor(null)}
          onDone={(id) => setReviewed((prev) => new Set([...prev, id]))}
        />
      )}

      <Footer />
    </div>
  );
}
