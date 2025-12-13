import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfilePopup from "./ProfilePopup";
import SettingsModal from "./SettingsModal";
import "../styles/index.css";

export default function Navbar() {
  const [searchActive, setSearchActive] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const [profileActive, setProfileActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef(null);

  /* Close menus on scroll */
  useEffect(() => {
    const onScroll = () => {
      setMobileActive(false);
      setProfileActive(false);
      setSearchActive(false);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="main-header">
      {/* Logo */}
      <Link to="/" className="logo">
        <img src="/images/ump-logo.jpeg" alt="UMP Logo" />
      </Link>

      {/* Navigation */}
      <nav className={`nav_links ${mobileActive ? "active" : ""}`}>
        <Link to="/" className="nav-link">
          Home
        </Link>
        <Link to="/market" className="nav-link">
          Marketplace
        </Link>
        <Link to="/services" className="nav-link">
          Services
        </Link>
        <Link to="/store" className="nav-link">
          Store
        </Link>
        <Link to="/partner" className="nav-link" id="out">
          Become a Partner
        </Link>
        <Link to="/hostel" className="nav-link">
          Hostel Hub
        </Link>
      </nav>

      {/* Icons */}
      <div className="navbar_icons">
        <div
          className="fas fa-bars"
          onClick={() => {
            setMobileActive((s) => !s);
            setProfileActive(false);
            setSearchActive(false);
          }}
        ></div>

        <div
          className="fas fa-search"
          onClick={() => {
            setSearchActive((s) => !s);
            setMobileActive(false);
            setProfileActive(false);
          }}
        ></div>

        <div
          className="fas fa-shopping-cart"
          onClick={() => navigate("/cart")}
        ></div>

        <div
          className="fas fa-user"
          onClick={() => {
            setProfileActive((p) => !p);
            setMobileActive(false);
            setSearchActive(false);
          }}
        ></div>
      </div>

      {/* Search */}
      <form
        className={`search-form ${searchActive ? "active" : ""}`}
        onSubmit={(e) => e.preventDefault()}
        ref={searchRef}
      >
        <input type="search" placeholder="Search here..." />
        <div className="fas fa-search"></div>
      </form>

      {/* Profile popup */}
      <ProfilePopup
        active={profileActive}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Settings modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </header>
  );
}
