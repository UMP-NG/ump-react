import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: "9rem", fontWeight: 900, letterSpacing: "-0.06em", color: "var(--accent)", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "16px 0 8px", color: "var(--ink-1)" }}>Page not found</h1>
      <p style={{ fontSize: "1.5rem", color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 360, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <button className="btn btn-primary btn-block btn-lg" style={{ borderRadius: "var(--r-pill)" }} onClick={() => navigate("/")}>
          <i className="fas fa-house" /> Go home
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" /> Go back
        </button>
      </div>
    </div>
  );
}
