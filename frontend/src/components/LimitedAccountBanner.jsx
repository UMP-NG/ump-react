import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function LimitedAccountBanner() {
  const { user } = useUser();
  const navigate  = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user?.isLimitedAccount || dismissed) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, #f97316 0%, #fb923c 100%)",
      color: "#fff",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: "1.3rem",
      zIndex: 1000,
    }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <strong>Limited account.</strong> You can browse and buy, but selling or listing requires a verified UNILAG student email.
      </span>
      <button
        onClick={() => navigate("/settings?tab=verify")}
        style={{
          background: "#fff",
          color: "#f97316",
          border: "none",
          borderRadius: 6,
          padding: "5px 14px",
          fontWeight: 700,
          fontSize: "1.2rem",
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        Link school email
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: "0 4px", fontSize: "1.4rem", opacity: 0.8 }}
        aria-label="Dismiss"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}
