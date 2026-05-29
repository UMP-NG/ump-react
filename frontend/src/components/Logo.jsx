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
      <img src={logoUrl || "/images/ump-logo.jpeg"} alt="UMP" style={{ height: 36, width: 36, borderRadius: 8, display: "block", objectFit: "cover" }} onError={(e) => { e.currentTarget.src = "/images/ump-logo.jpeg"; }} />
    </div>
  );
}
