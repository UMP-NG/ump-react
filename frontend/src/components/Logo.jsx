import { useNavigate } from "react-router-dom";

export default function Logo() {
  const navigate = useNavigate();
  return (
    <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
      <img src="/images/ump-icon.svg" alt="UMP" style={{ height: 36, width: 36, borderRadius: 8, display: "block" }} />
    </div>
  );
}
