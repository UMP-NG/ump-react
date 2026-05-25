import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { apiFetch } from "../utils/api";
import { socket } from "../utils/socket";
import Skel from "../components/Skel";

const TYPE_META = {
  order:   { icon: "box-archive",    color: "#f97316" },
  message: { icon: "message",        color: "#3b82f6" },
  payout:  { icon: "wallet",         color: "#22c55e" },
  review:  { icon: "star",           color: "#f59e0b" },
  booking: { icon: "calendar-check", color: "#8b5cf6" },
  dispute: { icon: "scale-balanced", color: "#ef4444" },
  system:  { icon: "bell",           color: "var(--ink-3)" },
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [markingAll, setMarkingAll]       = useState(false);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then((d) => setNotifications(d.notifications || []))
      .catch((err) => setError(err?.message || "Failed to load notifications"))
      .finally(() => setLoading(false));

    // Prepend notifications that arrive while the page is open
    function onNew(notif) {
      setNotifications((prev) => [notif, ...prev]);
    }
    socket.on("new_notification", onNew);
    return () => socket.off("new_notification", onNew);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiFetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
    finally { setMarkingAll(false); }
  }

  function handleClick(n) {
    if (!n.read) markRead(n._id);
    const link = n.link;
    if (link) navigate(link);
  }

  // Group today vs earlier
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayItems    = notifications.filter((n) => new Date(n.createdAt) >= todayStart);
  const earlierItems  = notifications.filter((n) => new Date(n.createdAt) <  todayStart);

  function renderItem(n) {
    const isRead = n.read;
    const meta = TYPE_META[n.type] || TYPE_META.system;
    return (
      <div
        key={n._id}
        onClick={() => handleClick(n)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          padding: "14px 12px", borderRadius: "var(--r-lg)",
          background: isRead ? "transparent" : "rgba(249,115,22,.05)",
          border: `1px solid ${isRead ? "transparent" : "rgba(249,115,22,.15)"}`,
          cursor: n.link ? "pointer" : "default",
          transition: "background .15s",
          marginBottom: 4,
        }}
        onMouseEnter={(e) => { if (n.link) e.currentTarget.style.background = "var(--surface)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isRead ? "transparent" : "rgba(249,115,22,.05)"; }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${meta.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`fas fa-${meta.icon}`} style={{ color: meta.color, fontSize: "1.5rem" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {n.title && (
            <div style={{ fontSize: "1.3rem", fontWeight: isRead ? 500 : 700, color: "var(--ink)", marginBottom: 2 }}>
              {n.title}
            </div>
          )}
          <div style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
            {n.message}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--ink-4)", marginTop: 4 }}>
            {timeAgo(n.createdAt)}
          </div>
        </div>
        {!isRead && (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 7 }} />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />

      {/* Header */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
          </button>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ fontSize: "1.3rem", background: "var(--accent)", color: "#fff", borderRadius: "var(--r-pill)", padding: "1px 9px", marginLeft: 8, verticalAlign: "middle" }}>
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-sm btn-ghost" disabled={markingAll} onClick={markAllRead}>
            {markingAll ? <i className="fas fa-spinner fa-spin" /> : "Mark all read"}
          </button>
        )}
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[1,2,3,4,5,6].map(i => <Skel.NotifRow key={i} />)}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <i className="fas fa-circle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: 14 }} />
            <p style={{ fontSize: "1.5rem", color: "var(--ink-2)", margin: "0 0 16px" }}>{error}</p>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              <i className="fas fa-rotate-right" /> Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <i className="fas fa-bell-slash" style={{ fontSize: "4rem", color: "var(--ink-4)", marginBottom: 16 }} />
            <p style={{ fontSize: "1.6rem", color: "var(--ink-2)", margin: 0 }}>All caught up!</p>
            <p style={{ fontSize: "1.3rem", color: "var(--ink-3)", marginTop: 6 }}>
              We'll notify you when something happens — orders, bookings, payouts and more.
            </p>
          </div>
        ) : (
          <>
            {todayItems.length > 0 && (
              <>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Today</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
                  {todayItems.map(renderItem)}
                </div>
              </>
            )}
            {earlierItems.length > 0 && (
              <>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Earlier</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {earlierItems.map(renderItem)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
