import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

const COOLDOWN = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
      setCooldown(COOLDOWN);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMsg("");
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });
      setResendMsg("Reset link sent again!");
      setCooldown(COOLDOWN);
    } catch (err) {
      setResendMsg(err.message || "Couldn't resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <div style={{ padding: "12px 16px 0" }}>
        <button className="icon-btn" style={{ background: "var(--surface)" }} onClick={() => navigate("/login")}>
          <i className="fas fa-arrow-left" />
        </button>
      </div>
      <div style={{ padding: "40px 24px 0", maxWidth: 440 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(249,115,22,.12)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "2.6rem", marginBottom: 20 }}>
          <i className="fas fa-key" />
        </div>

        {sent ? (
          <>
            <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>Check your inbox</h1>
            <p style={{ margin: "0 0 24px", color: "var(--ink-2)", fontSize: "1.4rem", lineHeight: 1.6 }}>
              We sent a reset link to <strong style={{ color: "var(--ink-1)" }}>{email}</strong>. Follow the instructions in the email to reset your password.
            </p>

            {/* Resend card */}
            <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", padding: "16px 18px", marginBottom: 16, border: "1px solid var(--line)" }}>
              <p style={{ margin: "0 0 12px", fontSize: "1.3rem", color: "var(--ink-2)" }}>Didn't receive it? Check your spam folder or resend below.</p>

              {resendMsg && (
                <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: "var(--r-md)", fontSize: "1.25rem", background: resendMsg.includes("sent") ? "#f0fdf4" : "#fef2f2", color: resendMsg.includes("sent") ? "#16a34a" : "#dc2626" }}>
                  <i className={`fas fa-${resendMsg.includes("sent") ? "circle-check" : "circle-exclamation"}`} style={{ marginRight: 6 }} />
                  {resendMsg}
                </div>
              )}

              <button
                className="btn btn-ghost btn-block"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                style={{ borderRadius: "var(--r-pill)" }}
              >
                {resending
                  ? <><i className="fas fa-spinner fa-spin" /> Sending…</>
                  : cooldown > 0
                  ? <><i className="fas fa-clock" /> Resend in {cooldown}s</>
                  : <><i className="fas fa-rotate-right" /> Resend reset link</>}
              </button>
            </div>

            <button className="btn btn-primary btn-block btn-lg" style={{ borderRadius: "var(--r-pill)" }} onClick={() => navigate("/login")}>
              Back to sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 style={{ fontSize: "2.6rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Forgot your password?</h1>
            <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.4rem" }}>Enter your UNILAG email and we'll send a reset link.</p>
            <div style={{ height: 24 }} />
            <div className="label">Email</div>
            <input className="input" type="email" placeholder="aisha@unilag.edu.ng" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && (
              <div style={{ marginTop: 12, padding: 10, background: "#fef2f2", color: "#dc2626", borderRadius: "var(--r-md)", fontSize: "1.3rem" }}>
                <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
              </div>
            )}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginTop: 20, borderRadius: "var(--r-pill)" }}>
              {loading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-paper-plane" /> Send reset link</>}
            </button>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: "1.3rem", color: "var(--ink-3)" }}>
              Remembered?{" "}
              <span style={{ color: "var(--accent)", fontWeight: 700, cursor: "pointer" }} onClick={() => navigate("/login")}>Sign in</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
