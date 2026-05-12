import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";

export default function Auth() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { setUser } = useUser();
  const email = state?.email || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const refs = useRef([]);

  function handleChange(i, val) {
    const v = val.replace(/\D/, "");
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/auth/verify-otp", { method: "POST", body: { email, otp: code } });
      setUser(data.user || data);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid code, try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendMsg("");
    setError("");
    try {
      await apiFetch("/api/auth/resend-otp", { method: "POST", body: { email } });
      setResendMsg("Code sent! Check your inbox.");
      let secs = 30;
      setResendCooldown(secs);
      cooldownRef.current = setInterval(() => {
        secs -= 1;
        setResendCooldown(secs);
        if (secs <= 0) clearInterval(cooldownRef.current);
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to resend code, try again");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <div style={{ padding: "12px 16px 0" }}>
        <button className="icon-btn" style={{ background: "var(--surface)" }} onClick={() => navigate("/login")}>
          <i className="fas fa-arrow-left" />
        </button>
      </div>
      <div style={{ padding: "40px 24px 0", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 24px", borderRadius: 24, background: "rgba(249,115,22,.12)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
          <i className="fas fa-envelope-circle-check" />
        </div>
        <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>Verify your email</h1>
        <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", margin: 0 }}>
          We sent a 6-digit code to<br />
          <strong style={{ color: "var(--ink-1)" }}>{email || "your email"}</strong>
        </p>
      </div>
      <div style={{ padding: "32px 24px 0", display: "flex", gap: 8, justifyContent: "center" }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={d}
            maxLength={1}
            inputMode="numeric"
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{ width: 48, height: 56, textAlign: "center", fontSize: "2.4rem", fontWeight: 800, border: d ? "2px solid var(--accent)" : "1px solid var(--line-strong)", borderRadius: "var(--r-md)", background: d ? "rgba(249,115,22,.04)" : "#fff", color: "var(--ink-1)", outline: "none" }}
          />
        ))}
      </div>
      {error && <div style={{ margin: "12px 24px 0", padding: 10, background: "#fef2f2", color: "#dc2626", borderRadius: "var(--r-md)", fontSize: "1.3rem", textAlign: "center" }}>{error}</div>}
      {resendMsg && <div style={{ margin: "12px 24px 0", padding: 10, background: "#f0fdf4", color: "#16a34a", borderRadius: "var(--r-md)", fontSize: "1.3rem", textAlign: "center" }}>{resendMsg}</div>}
      <div style={{ padding: "24px 24px 0" }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={handleVerify} disabled={loading}>
          {loading ? <i className="fas fa-spinner fa-spin" /> : <>Verify <i className="fas fa-arrow-right" /></>}
        </button>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: "1.3rem", color: "var(--ink-3)" }}>
          Didn't get the code?{" "}
          <span
            style={{ color: resendCooldown > 0 ? "var(--ink-3)" : "var(--accent)", fontWeight: 700, cursor: resendCooldown > 0 ? "default" : "pointer" }}
            onClick={handleResend}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </span>
        </p>
      </div>
    </div>
  );
}
