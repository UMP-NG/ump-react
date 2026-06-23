import { useNavigate } from "react-router-dom";
import { useAppConfig } from "../context/AppConfigContext";

export default function Logo() {
  const navigate = useNavigate();
  const { logoUrl } = useAppConfig();
  function handleKey(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/"); }
  }
  return (
    <div
      className="logo"
      role="button"
      tabIndex={0}
      onClick={() => navigate("/")}
      onKeyDown={handleKey}
      style={{ cursor: "pointer" }}
      aria-label="UMP – go to home"
    >
      <img
        src={logoUrl || "/images/ump-logo.png"}
        alt="UMP"
        style={{ height: 36, width: 36, borderRadius: 8, display: "block", objectFit: "cover" }}
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback === "1") return; // all fallbacks exhausted
          el.dataset.fallback = "1";
          el.src = "/images/ump-logo.png";
        }}
      />
    </div>
  );
}
