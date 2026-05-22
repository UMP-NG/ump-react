import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage";

export default function ImageCropModal({ src, aspect = 1, onConfirm, onCancel, title = "Crop image" }) {
  const [crop, setCrop]               = useState({ x: 0, y: 0 });
  const [zoom, setZoom]               = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [busy, setBusy]               = useState(false);

  const onCropComplete = useCallback((_, pixels) => setCroppedArea(pixels), []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setBusy(true);
    try {
      const blob = await getCroppedImg(src, croppedArea);
      onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: "rgba(0,0,0,.82)" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--navy-900, #0f172a)", flexShrink: 0 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>{title}</div>
        <button className="icon-btn" onClick={onCancel} style={{ color: "#fff" }}>
          <i className="fas fa-xmark" style={{ fontSize: "1.6rem" }} />
        </button>
      </div>

      {/* Crop area */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{ containerStyle: { background: "#000" } }}
        />
      </div>

      {/* Controls */}
      <div style={{ padding: "16px 20px", background: "var(--navy-900, #0f172a)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <i className="fas fa-magnifying-glass-minus" style={{ color: "rgba(255,255,255,.5)", fontSize: "1.3rem" }} />
          <input
            type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <i className="fas fa-magnifying-glass-plus" style={{ color: "rgba(255,255,255,.5)", fontSize: "1.3rem" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1, color: "#fff", border: "1px solid rgba(255,255,255,.2)" }} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirm} disabled={busy}>
            {busy ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-crop-simple" /> Use this crop</>}
          </button>
        </div>
      </div>
    </div>
  );
}
