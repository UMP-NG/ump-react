import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch, clearToken, clearAllCache } from "../utils/api";

export default function ProfilePopup({ onClose }) {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isSeller   = roles.includes("seller");
  const isProvider = roles.includes("service_provider");
  const isAdmin    = Array.isArray(user?.roles) && user.roles.includes("admin");
  const isLimited  = user?.isLimitedAccount;

  // Note: Dark mode toggle was removed from profile menu per user request

  const MENU = [
    ...(isAdmin ? [{ icon: "user-shield", label: "Admin panel", path: "/admin", admin: true }] : []),
    { icon: "box-archive",        label: "My orders",           path: "/orders" },
    { icon: "calendar-check",     label: "My bookings",         path: "/bookings" },
    { icon: "wallet",             label: "Wallet",              path: "/wallet" },
    { icon: "heart",              label: "Wishlist",            path: "/wishlist" },
    ...(!isLimited && isSeller   ? [{ icon: "store",              label: "Seller dashboard",         path: "/seller-dashboard" }] : []),
    ...(!isLimited && isProvider ? [{ icon: "hand-holding-heart", label: "Provider analytics",       path: "/provider-analytics" }] : []),
    ...(!isLimited && !isSeller && !isProvider ? [{ icon: "circle-plus", label: "Become a seller / provider", path: "/partner", accent: true }] : []),
    ...(!isLimited && isSeller !== isProvider  ? [{ icon: "circle-plus", label: "Add another role",           path: "/partner", accent: true }] : []),
    ...(isLimited ? [{ icon: "link", label: "Link school email", path: "/settings?tab=verify", accent: true }] : []),
    { icon: "gear",               label: "Settings",            path: "/settings" },
    { icon: "circle-question",    label: "Help & support",      path: "/help" },
  ];

  const initials = user
    ? (user.name || user.email || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  async function handleLogout() {
    // Unsubscribe push while session is still valid so the DB record is removed
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await sub.unsubscribe();
        await apiFetch("/api/push/unsubscribe", { method: "DELETE", body: { endpoint: sub.endpoint } });
      }
    } catch { /* ignore — push cleanup is best-effort */ }

    try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    clearToken();
    clearAllCache();
    setUser(null);
    onClose();
    navigate("/login");
  }

  function handleNav(path) {
    onClose();
    if (path !== "#") navigate(path);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 70 }} />
      <div style={{ position: "fixed", top: 70, right: 12, width: 280, background: "var(--paper)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-deep)", overflow: "hidden", zIndex: 80, animation: "fadeUp .25s", border: "1px solid var(--line)" }}>
        <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, var(--navy-800), #1e1b4b)", color: "#fff" }}>
          <div className="avatar" style={{ width: 44, height: 44, overflow: "hidden", padding: avatarUrl && !avatarBroken ? 0 : undefined }}>
              {avatarUrl && !avatarBroken
                ? <img src={avatarUrl} alt={user?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarBroken(true)} />
                : initials}
            </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{user?.name || "Guest"}</div>
            <div style={{ fontSize: "1.1rem", opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email || "—"}
            </div>
            {user?.referralCode && (
              <div style={{ fontSize: "0.95rem", opacity: 0.85, marginTop: 6, fontFamily: "monospace", fontWeight: 600, color: "#fbbf24" }}>
                Referral: <span style={{ letterSpacing: "0.05em" }}>{user.referralCode}</span>
              </div>
            )}
          </div>
        </div>
        {/* Wallet section */}
        {user?.referralCredit !== undefined && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "rgba(59,130,246,.05)" }}>
            <div style={{ fontSize: "0.95rem", color: "var(--ink-3)", marginBottom: 4 }}>UMP Wallet Balance</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--accent)" }}>
              ₦{Number(user.referralCredit || 0).toLocaleString()}
            </div>
          </div>
        )}
        <div style={{ padding: 8, maxHeight: "calc(100vh - 220px)", overflowY: "auto", scrollbarWidth: "thin" }}>
          {MENU.map((it) => (
            <button
              key={it.label}
              onClick={() => handleNav(it.path)}
              style={{
                width: "100%", padding: "12px 14px", display: "flex", alignItems: "center",
                gap: 12, border: "none", cursor: "pointer", fontSize: "1.4rem",
                borderRadius: "var(--r-md)", textAlign: "left",
                background: it.admin ? "rgba(249,115,22,.08)" : "transparent",
                color: it.admin ? "var(--accent)" : it.accent ? "var(--accent)" : "var(--ink-1)",
                fontWeight: it.admin || it.accent ? 700 : 500,
              }}
            >
              <i className={`fas fa-${it.icon}`} style={{ width: 20, textAlign: "center" }} /> {it.label}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
          <button
            onClick={handleLogout}
            style={{ width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer", fontSize: "1.4rem", borderRadius: "var(--r-md)", color: "#ef4444", fontWeight: 600, textAlign: "left" }}
          >
            <i className="fas fa-right-from-bracket" style={{ width: 20, textAlign: "center" }} /> Log out
          </button>
        </div>
      </div>
    </>
  );
}
