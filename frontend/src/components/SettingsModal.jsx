import React, { useState, useRef, useEffect } from "react";
import "../styles/index.css";

export default function SettingsModal({ open, onClose }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [website, setWebsite] = useState("");
  const [imagePreview, setImagePreview] = useState(
    "/images/avatar-placeholder.png"
  );
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // reset or load real user data here when integrating
  }, [open]);

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function saveSettings() {
    // production-ready: send to backend using fetch and FormData or API client
    // placeholder
    console.log({
      displayName,
      bio,
      phone,
      address,
      dateOfBirth,
      gender,
      website,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <button className="close-butn" onClick={onClose}>
          &times;
        </button>
        <h2>User Settings</h2>

        <div className="settings-section">
          <h3>Basic Information</h3>

          <label>Display Name:</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter full name"
          />

          <label>Profile Image:</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
          />

          <div
            id="imagePreviewContainer"
            style={{ marginTop: 10, textAlign: "center" }}
          >
            <img
              id="imagePreview"
              src={imagePreview}
              alt="Preview"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </div>

          <label>Bio:</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write something about yourself..."
          />

          <label>Phone:</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
          />

          <label>Address:</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your address"
          />

          <label>Date of Birth:</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <label>Gender:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <label>Website:</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div className="settings-section">
          <h3>Preferences & Security</h3>

          <label>Two-Factor Authentication:</label>
          <select>
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </select>

          <label>Notifications:</label>
          <select>
            <option value="all">All Notifications</option>
            <option value="important">Important Only</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="settings-section">
          <button id="saveSettings" className="save-btn" onClick={saveSettings}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
