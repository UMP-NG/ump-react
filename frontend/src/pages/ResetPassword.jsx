import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";

function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/\d/.test(pw)) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
const STRENGTH_LABELS = ["Weak", "Fair", "Good", "Strong"];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const score = strength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/auth/reset-password/${token}`, { method: "PUT", body: { password } });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <div style={{ padding: "12px 16px 0" }}>
        <button className="icon-btn" style={{ background: "var(--surface)" }} onClick={() => navigate("/login")}>
          <i className="fas fa-arrow-left" />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "40px 24px 0" }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(34,197,94,.12)", color: "var(--success)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "2.6rem", marginBottom: 20 }}>
          <i className="fas fa-lock" />
        </div>
        <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Set a new password</h1>
        <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.4rem" }}>Make it strong — at least 8 characters.</p>
        <div style={{ height: 24 }} />
        <div className="label">New password</div>
        <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div style={{ height: 14 }} />
        <div className="label">Confirm new password</div>
        <input className="input" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        {password.length > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".1em" }}>Strength</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: STRENGTH_COLORS[score - 1] || "var(--ink-3)" }}>{score > 0 ? STRENGTH_LABELS[score - 1] : "Too short"}</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= score ? (STRENGTH_COLORS[score - 1] || "var(--line-strong)") : "var(--line-strong)" }} />
              ))}
            </div>
            <ul style={{ paddingLeft: 16, margin: "10px 0 0", fontSize: "1.1rem", color: "var(--ink-2)" }}>
              <li><i className={`fas fa-${password.length >= 8 ? "check" : "circle"}`} style={{ color: password.length >= 8 ? "var(--success)" : "var(--ink-4)", fontSize: password.length >= 8 ? "1em" : ".7em" }} /> 8+ characters</li>
              <li><i className={`fas fa-${/\d/.test(password) ? "check" : "circle"}`} style={{ color: /\d/.test(password) ? "var(--success)" : "var(--ink-4)", fontSize: /\d/.test(password) ? "1em" : ".7em" }} /> 1 number</li>
              <li><i className={`fas fa-${/[^a-zA-Z0-9]/.test(password) ? "check" : "circle"}`} style={{ color: /[^a-zA-Z0-9]/.test(password) ? "var(--success)" : "var(--ink-4)", fontSize: /[^a-zA-Z0-9]/.test(password) ? "1em" : ".7em" }} /> 1 special character</li>
            </ul>
          </div>
        )}

        {error && <div style={{ marginTop: 12, padding: 10, background: "#fef2f2", color: "#dc2626", borderRadius: "var(--r-md)", fontSize: "1.3rem" }}>{error}</div>}
        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginTop: 20 }}>
          {loading ? <i className="fas fa-spinner fa-spin" /> : "Reset password"}
        </button>
      </form>
    </div>
  );
}
