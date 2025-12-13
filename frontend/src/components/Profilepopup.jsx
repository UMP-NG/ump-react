import React from "react";
import "../styles/index.css";

export default function ProfilePopup({ active, onOpenSettings }) {
  return (
    <div className={`profile-popup ${active ? "active" : ""}`}>
      <div className="profile-settings">
        <button aria-label="Open settings" onClick={onOpenSettings}>
          <i className="fas fa-cog"></i>
        </button>
      </div>
      <div className="profile-header">
        <div className="profile-avatar">
          <img
            id="profileAvatar"
            src="/images/guy.png"
            alt="Avatar"
            className="profile-avatar"
          />
        </div>
        <div className="profile-info">
          <h3 id="profileName">Guest</h3>
          <span id="profileEmail" className="profile-email">
            -
          </span>
          <span id="profileStatus" className="profile-status">
            ❌ Logged out
          </span>
        </div>
      </div>

      <div className="profile-actions">
        <button className="profile-btn" id="signInBtn">
          Sign In
        </button>
        <button className="profile-btn logout" id="logoutBtn">
          Logout
        </button>
      </div>
    </div>
  );
}
