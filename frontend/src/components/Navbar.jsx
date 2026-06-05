import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import ProfilePopup from "./Profilepopup";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../utils/api";
import { socket } from "../utils/socket";

export function useTheme() {
  const [dark, setDark] = useState(
    () => (typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") === "dark"
      : false)
  );
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ump-theme", next);
    setDark(!dark);
  }
  return [dark, toggle];
}

const NAV_LINKS = [
  { path: "/",         label: "Home" },
  { path: "/market",   label: "Marketplace" },
  { path: "/services", label: "Services" },
  { path: "/hustle",   label: "The Hustle" },
  { path: "/hostel",   label: "Hostel Hub" },
];

export default function Navbar({ frosted = false, dark = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useUser();
  const [showProfile, setShowProfile] = useState(false);
  const [isDark, toggleTheme] = useTheme();
  const [search, setSearch] = useState("");
  const [mobSearch, setMobSearch] = useState(false);
  const [mobQ, setMobQ] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) { setNotifCount(0); setCartCount(0); return; }
    apiFetch("/api/cart")
      .then((d) => setCartCount((d.items || d || []).length))
      .catch(() => {});
    apiFetch("/api/notifications")
      .then((d) => {
        const list = d.notifications || d || [];
        setNotifCount(list.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, [user]);

  // Real-time: bump badge whenever a new notification arrives over the socket
  useEffect(() => {
    function onNewNotif() { if (user) setNotifCount((c) => c + 1); }
    socket.on("new_notification", onNewNotif);
    return () => socket.off("new_notification", onNewNotif);
  }, [user]);

  // Reset badge when user marks all as read on the Notifications page
  useEffect(() => {
    function onAllRead() { setNotifCount(0); }
    window.addEventListener("notifications:all-read", onAllRead);
    return () => window.removeEventListener("notifications:all-read", onAllRead);
  }, []);
  const mobInputRef = useRef(null);

  const cls = ["nav", frosted ? "frosted" : "", dark ? "dark" : ""].filter(Boolean).join(" ");

  const initials = user
    ? (user.name || user.email || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const [avatarBroken, setAvatarBroken] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  function openMobSearch() {
    setMobSearch(true);
    setMobQ("");
    setTimeout(() => mobInputRef.current?.focus(), 50);
  }

  function closeMobSearch() {
    setMobSearch(false);
    setMobQ("");
  }

  function submitMobSearch(e) {
    e.preventDefault();
    if (mobQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(mobQ.trim())}`);
      closeMobSearch();
    }
  }

  // close mobile search when route changes
  useEffect(() => { closeMobSearch(); }, [pathname]);

  function isActive(path) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <>
      <nav className={cls}>
        {mobSearch ? (
          /* ── Mobile search bar (replaces nav content) ── */
          <form onSubmit={submitMobSearch} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <button type="button" className="icon-btn" onClick={closeMobSearch} style={{ flexShrink: 0 }}>
              <i className="fas fa-arrow-left" />
            </button>
            <div className="search-wrap" style={{ flex: 1 }}>
              <i className="fas fa-magnifying-glass search-icon" />
              <input
                ref={mobInputRef}
                className="input"
                placeholder="Search products, services, stores…"
                value={mobQ}
                onChange={(e) => setMobQ(e.target.value)}
                style={{ padding: "10px 14px 10px 40px", height: 42 }}
              />
            </div>
            {mobQ.trim() && (
              <button type="submit" className="icon-btn" style={{ background: "var(--accent)", color: "#fff", flexShrink: 0 }}>
                <i className="fas fa-arrow-right" />
              </button>
            )}
          </form>
        ) : (
          <>
            <Logo />

            {/* Desktop nav links */}
            <div className="nav-links">
              {NAV_LINKS.map((l) => (
                <span
                  key={l.path}
                  onClick={() => navigate(l.path)}
                  style={{
                    fontSize: "1.4rem", fontWeight: 600, cursor: "pointer",
                    color: isActive(l.path) ? "var(--accent)" : dark ? "rgba(255,255,255,.8)" : "var(--ink-2)",
                    position: "relative",
                    transition: "color .15s",
                  }}
                >
                  {l.label}
                  {isActive(l.path) && (
                    <span style={{ position: "absolute", bottom: -6, left: 0, right: 0, height: 3, background: "var(--accent)", borderRadius: 3 }} />
                  )}
                </span>
              ))}
            </div>

            {/* Right icons */}
            <div className="nav-icons">
              {/* Desktop search */}
              <form className="nav-search" onSubmit={handleSearch}>
                <div className="search-wrap" style={{ width: 220 }}>
                  <i className="fas fa-magnifying-glass search-icon" />
                  <input
                    className="input"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: "10px 14px 10px 40px", height: 40 }}
                  />
                </div>
              </form>

              {/* Mobile search icon */}
              <button className="icon-btn mob-only" onClick={openMobSearch} title="Search">
                <i className="fas fa-magnifying-glass" />
              </button>

              {/* Theme toggle — always visible */}
              <button
                className="icon-btn"
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                style={{ color: isDark ? "#fbbf24" : "var(--ink-2)" }}
              >
                <i className={`fas fa-${isDark ? "sun" : "moon"}`} />
              </button>

              {user ? (
                <>
                  <button className="icon-btn" style={{ position: "relative" }} onClick={() => navigate("/notifications")}>
                    <i className="fas fa-bell" />
                    {notifCount > 0 && (
                      <span style={{
                        position: "absolute", top: 2, right: 2,
                        minWidth: 16, height: 16, borderRadius: 8,
                        background: "var(--accent)", color: "#fff",
                        fontSize: "1rem", fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1, padding: "0 3px",
                      }}>{notifCount > 99 ? "99+" : notifCount}</span>
                    )}
                  </button>
                  <button className="icon-btn" style={{ position: "relative" }} onClick={() => navigate("/cart")}>
                    <i className="fas fa-bag-shopping" />
                    {cartCount > 0 && <span className="badge-dot" />}
                  </button>
                  <div className="avatar" onClick={() => setShowProfile(true)} style={{ overflow: "hidden", padding: avatarUrl && !avatarBroken ? 0 : undefined }}>
                    {avatarUrl && !avatarBroken
                      ? <img src={avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarBroken(true)} />
                      : initials}
                  </div>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>Sign in</button>
              )}
            </div>
          </>
        )}
      </nav>
      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} />}
    </>
  );
}
