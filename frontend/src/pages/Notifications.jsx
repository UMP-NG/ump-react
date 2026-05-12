import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const TYPE_ICON = {
  order:   { icon: "box-archive",        color: "#f97316" },
  message: { icon: "message",            color: "#3b82f6" },
  payout:  { icon: "wallet",             color: "#22c55e" },
  review:  { icon: "star",               color: "#f59e0b" },
  booking: { icon: "calendar-check",     color: "#8b5cf6" },
  system:  { icon: "bell",               color: "var(--ink-3)" },
};

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then((d) => setNotifications(d.notifications || d || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  async function markRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true, isRead: true } : n))
    );
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {}
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read && !n.isRead)
          .map((n) => apiFetch(`/api/notifications/${n._id}/read`, { method: "PATCH" }))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } catch {}
    finally { setMarkingAll(false); }
  }

  function handleClick(n) {
    markRead(n._id);
    const link = n.link || n.actionUrl;
    if (link) navigate(link);
  }

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Notifications {unreadCount > 0 && <span style={{ fontSize: "1.4rem", background: "var(--accent)", color: "#fff", borderRadius: "var(--r-pill)", padding: "1px 8px", marginLeft: 6 }}>{unreadCount}</span>}
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
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <i className="fas fa-bell-slash" style={{ fontSize: "4rem", color: "var(--ink-4)", marginBottom: 16 }} />
            <p style={{ fontSize: "1.6rem", color: "var(--ink-2)", margin: 0 }}>No notifications yet</p>
            <p style={{ fontSize: "1.3rem", color: "var(--ink-3)", marginTop: 6 }}>We'll let you know when something happens.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {notifications.map((n) => {
              const isRead = n.read || n.isRead;
              const kind = TYPE_ICON[n.type] || TYPE_ICON.system;
              return (
                <div
                  key={n._id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "14px 12px", borderRadius: "var(--r-lg)",
                    background: isRead ? "transparent" : "rgba(249,115,22,.05)",
                    border: isRead ? "1px solid transparent" : "1px solid rgba(249,115,22,.15)",
                    cursor: n.link || n.actionUrl ? "pointer" : "default",
                    transition: "background .15s",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${kind.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`fas fa-${kind.icon}`} style={{ color: kind.color, fontSize: "1.5rem" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {n.title && <div style={{ fontSize: "1.3rem", fontWeight: isRead ? 500 : 700, color: "var(--ink-1)", marginBottom: 2 }}>{n.title}</div>}
                    <div style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{n.message || n.body || n.text}</div>
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-4)", marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
