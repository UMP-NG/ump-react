import { useNavigate } from "react-router-dom";

export default function Logo() {
  const navigate = useNavigate();
  return (
    <div className="logo" onClick={() => navigate("/")}>
      U<span className="m">M</span>P
    </div>
  );
}
