import { useNavigate } from "react-router-dom";

export default function Logo() {
  const navigate = useNavigate();
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
      <img src="/images/ump-icon.svg" alt="" style={{ height: 36, width: 36, borderRadius: 8, display: "block" }} />
    </div>
  );
}
