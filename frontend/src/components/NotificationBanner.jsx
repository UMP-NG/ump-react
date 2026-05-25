import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../utils/socket";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../utils/api";

const TYPE_ICON = {
  order:   "box-archive",
  message: "message",
  payout:  "wallet",
  review:  "star",
  booking: "calendar-check",
  dispute: "scale-balanced",
  system:  "bell",
};
const TYPE_COLOR = {
  order:   "#f97316",
  message: "#3b82f6",
  payout:  "#22c55e",
  review:  "#f59e0b",
  booking: "#8b5cf6",
  dispute: "#ef4444",
  system:  "var(--ink-3)",
};

function urlBase64ToUint8Array(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function setupWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  // 1. Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  // 2. Register (or reuse) the service worker
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  // 3. Get the VAPID public key from the backend
  const { key } = await apiFetch("/api/push/vapid-key");
  if (!key) return; // push not configured on this backend

  // 4. Subscribe (no-op if already subscribed to the same key)
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Re-send in case the subscription was evicted from the DB
    await apiFetch("/api/push/subscribe", { method: "POST", body: existing.toJSON() });
    return;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  // 5. Save subscription on the backend
  await apiFetch("/api/push/subscribe", { method: "POST", body: sub.toJSON() });
}

function fireBrowserNotification(notif, onClickLink) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  // Only fire the OS notification when the tab is not visible
  if (document.visibilityState === "visible") return;
  const n = new Notification(notif.title || "UMP", {
    body: notif.message,
    icon: "/images/ump-icon.svg",
    tag: notif._id,
  });
  if (notif.link) {
    n.onclick = () => { window.focus(); onClickLink(notif.link); n.close(); };
  }
}

export default function NotificationBanner() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const timerRef = useRef({});

  // Register SW + subscribe to web push as soon as user is logged in
  useEffect(() => {
    if (user) setupWebPush().catch(() => { /* ignore — push is best-effort */ });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    function onNew(notif) {
      const id = notif._id || Date.now().toString();
      setQueue((q) => [...q, { ...notif, _key: id }]);
      timerRef.current[id] = setTimeout(() => dismiss(id), 5000);
      fireBrowserNotification({ ...notif, _id: id }, navigate);
    }
    socket.on("new_notification", onNew);
    return () => socket.off("new_notification", onNew);
  }, [user, navigate]);

  // Clear all pending auto-dismiss timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerRef.current).forEach(clearTimeout);
      timerRef.current = {};
    };
  }, []);

  function dismiss(key) {
    clearTimeout(timerRef.current[key]);
    delete timerRef.current[key];
    setQueue((q) => q.filter((n) => n._key !== key));
  }

  function handleClick(n) {
    dismiss(n._key);
    if (n.link) navigate(n.link);
  }

  if (!queue.length) return null;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 10000,
      display: "flex", flexDirection: "column", gap: 10,
      maxWidth: "min(360px, calc(100vw - 32px))",
      pointerEvents: "none",
    }}>
      {queue.map((n) => {
        const icon  = TYPE_ICON[n.type]  || TYPE_ICON.system;
        const color = TYPE_COLOR[n.type] || TYPE_COLOR.system;
        return (
          <div
            key={n._key}
            onClick={() => handleClick(n)}
            style={{
              pointerEvents: "auto",
              background: "var(--white, #fff)",
              border: "1px solid var(--line, #e2e8f0)",
              borderLeft: `4px solid ${color}`,
              borderRadius: "var(--r-lg, 14px)",
              padding: "12px 14px",
              boxShadow: "0 8px 32px rgba(15,23,42,.18)",
              display: "flex", alignItems: "flex-start", gap: 12,
              cursor: n.link ? "pointer" : "default",
              animation: "notif-slide-in .25s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className={`fas fa-${icon}`} style={{ color, fontSize: "1.3rem" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {n.title && (
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-1, #0f172a)", lineHeight: 1.3, marginBottom: 2 }}>
                  {n.title}
                </div>
              )}
              <div style={{ fontSize: "1.2rem", color: "var(--ink-2, #475569)", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {n.message}
              </div>
              {n.link && (
                <div style={{ fontSize: "1.1rem", color: color, fontWeight: 600, marginTop: 4 }}>
                  Tap to view <i className="fas fa-arrow-right" style={{ fontSize: "0.9rem" }} />
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(n._key); }}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3, #94a3b8)", padding: 0, flexShrink: 0, fontSize: "1.2rem", lineHeight: 1 }}
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
