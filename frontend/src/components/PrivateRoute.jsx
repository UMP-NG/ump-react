import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function PrivateRoute({ children }) {
  const { user } = useUser();
  const location = useLocation();

  // Still loading user session — show nothing (avoids flash redirect)
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "2.4rem", color: "var(--accent)" }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
