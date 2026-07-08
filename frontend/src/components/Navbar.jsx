import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import ProfilePopup from "./Profilepopup";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
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
  const showToast = useToast();
  const [isDark, toggleTheme] = useTheme();
  const [search, setSearch] = useState("");
  const [mobSearch, setMobSearch] = useState(false);
  const [mobQ, setMobQ] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const suggestionsTimeoutRef = useRef(null);

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

  // Real-time: bump badge and show toast for incoming messages
  useEffect(() => {
    function onNewNotif(notif) {
      if (!user) return;
      setNotifCount((c) => c + 1);
      if (notif?.type === "message" && !pathname.startsWith("/messages")) {
        showToast(notif.title || "New message", "info");
      }
    }
    socket.on("new_notification", onNewNotif);
    return () => socket.off("new_notification", onNewNotif);
  }, [user, pathname, showToast, socket]);

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

  // Fetch search suggestions
  function fetchSuggestions(q) {
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(suggestionsTimeoutRef.current);
    suggestionsTimeoutRef.current = setTimeout(() => {
      Promise.allSettled([
        apiFetch(`/api/products?search=${encodeURIComponent(q)}&limit=3`),
        apiFetch(`/api/services?search=${encodeURIComponent(q)}&limit=3`),
        apiFetch(`/api/sellers?search=${encodeURIComponent(q)}&limit=3`),
      ]).then(([pr, sr, slr]) => {
        const prods = pr.status === "fulfilled" ? (pr.value?.products || pr.value || []).slice(0, 3) : [];
        const servs = sr.status === "fulfilled" ? (sr.value?.services || sr.value || []).slice(0, 3) : [];
        const sells = slr.status === "fulfilled" ? (Array.isArray(slr.value) ? slr.value : slr.value?.sellers || []).slice(0, 3) : [];
        const all = [
          ...prods.map((p) => ({ type: "product", _id: p._id, name: p.name, icon: "bag-shopping" })),
          ...servs.map((s) => ({ type: "service", _id: s._id, name: s.name, icon: "hand-holding-heart" })),
          ...sells.map((s) => ({ type: "seller", _id: s._id, name: s.storeName || s.name, icon: "store" })),
        ];
        setSuggestions(all);
        setShowSuggestions(all.length > 0);
      });
    }, 300);
  }

  function handleSearchChange(val) {
    setSearch(val);
    fetchSuggestions(val);
  }

  function handleSuggestionClick(suggestion) {
    setShowSuggestions(false);
    if (suggestion.type === "product") {
      navigate(`/products/${suggestion._id}`);
    } else if (suggestion.type === "service") {
      navigate(`/services/${suggestion._id}`);
    } else if (suggestion.type === "seller") {
      navigate(`/sellers/${suggestion._id}`);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
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
              <form className="nav-search" onSubmit={handleSearch} style={{ position: "relative" }}>
                <div className="search-wrap" style={{ width: 220 }}>
                  <i className="fas fa-magnifying-glass search-icon" />
                  <input
                    className="input"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                    style={{ padding: "10px 14px 10px 40px", height: 40 }}
                  />
                </div>
                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} style={{
                    position: "absolute", top: 40, left: 0, right: 0, background: "var(--paper)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-md)", zIndex: 100, maxHeight: 300, overflowY: "auto", border: "1px solid var(--line)"
                  }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={`${s.type}-${s._id}`}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        style={{
                          width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", borderBottom: i < suggestions.length - 1 ? "1px solid var(--line)" : "none",
                          color: "var(--ink-1)", fontSize: "1.3rem", transition: "background .15s",
                        }}
                        onMouseEnter={(e) => e.target.style.background = "rgba(59,130,246,.05)"}
                        onMouseLeave={(e) => e.target.style.background = "transparent"}
                      >
                        <i className={`fas fa-${s.icon}`} style={{ color: "var(--accent)", width: 18 }} />
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
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
