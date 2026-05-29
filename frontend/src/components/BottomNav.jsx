import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

const MAIN = [
  { id: "home",      path: "/",          icon: "house",              label: "Home" },
  { id: "market",    path: "/market",    icon: "store",              label: "Market" },
  { id: "services",  path: "/services",  icon: "hand-holding-heart", label: "Services" },
  { id: "providers", path: "/providers", icon: "people-group",       label: "Providers" },
];

const MORE_ITEMS = [
  { id: "hostel",   path: "/hostel",   icon: "bed",           label: "Hostel Hub" },
  { id: "messages", path: "/messages", icon: "comment-dots",  label: "Chats" },
  { id: "orders",   path: "/orders",   icon: "box-open",      label: "My Orders" },
  { id: "wishlist", path: "/wishlist", icon: "heart",         label: "Wishlist",  authOnly: true },
  { id: "partner",  path: "/partner",  icon: "circle-plus",   label: "Become a Partner", authOnly: true },
  { id: "search",   path: "/search",   icon: "magnifying-glass", label: "Search" },
  { id: "cart",     path: "/cart",     icon: "bag-shopping",  label: "Cart" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useUser();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleMore = MORE_ITEMS.filter((i) => !i.authOnly || user);

  function active(path) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  function go(path) {
    setMoreOpen(false);
    navigate(path);
  }

  const anyMoreActive = visibleMore.some((i) => active(i.path));

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 58, background: "rgba(15,23,42,.35)" }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More panel — slides up */}
      {moreOpen && (
        <div className="more-panel">
          <div className="more-panel-grid">
            {visibleMore.map((item, i) => (
              <button
                key={item.id}
                className={`more-panel-item${active(item.path) ? " active" : ""}`}
                onClick={() => go(item.path)}
                style={{ animationDelay: `${i * 0.035}s` }}
              >
                <i className={`fas fa-${item.icon}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="bottom-nav">
        {MAIN.map((item) => (
          <button
            key={item.id}
            className={`item${active(item.path) ? " active" : ""}`}
            onClick={() => { setMoreOpen(false); navigate(item.path); }}
          >
            <i className={`fas fa-${item.icon}`} />
            {item.label}
          </button>
        ))}
        <button
          className={`item${moreOpen || anyMoreActive ? " active" : ""}`}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <i className={`fas fa-${moreOpen ? "xmark" : "grip"}`} />
          More
        </button>
      </nav>
    </>
  );
}
