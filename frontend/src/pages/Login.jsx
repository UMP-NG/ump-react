import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { apiFetch, setToken } from "../utils/api";
import { useUser } from "../context/UserContext";
import { auth } from "../config/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";

const DOMAIN = "@live.unilag.edu.ng";

function getStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s; // 0–5
}

const STRENGTH_LABEL = ["", "Too weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function StrengthBar({ pwd }) {
  const s = getStrength(pwd);
  if (!pwd) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= s ? STRENGTH_COLOR[s] : "var(--line)", transition: "background .2s" }} />
        ))}
      </div>
      <span style={{ fontSize: "1.1rem", color: STRENGTH_COLOR[s], fontWeight: 600 }}>{STRENGTH_LABEL[s]}</span>
    </div>
  );
}

function Rule({ ok, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.15rem", color: ok ? "#16a34a" : "var(--ink-3)" }}>
      <i className={`fas fa-${ok ? "circle-check" : "circle"}`} style={{ fontSize: "1rem" }} />
      {text}
    </div>
  );
}

// Extract a referral code from either a plain code or a pasted referral link
function extractCode(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Looks like a URL or contains a query param
  if (trimmed.includes("ref=") || trimmed.startsWith("http")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://x.com/?${trimmed}`);
      const ref = url.searchParams.get("ref");
      if (ref) return ref.toUpperCase();
    } catch {
      const m = trimmed.match(/[?&]ref=([^&\s]+)/i);
      if (m) return m[1].toUpperCase();
    }
  }
  return trimmed.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function ReferralInput({ value, onChange }) {
  const [raw, setRaw] = useState(value || "");
  const [status, setStatus] = useState(null); // null | "checking" | "valid" | "invalid"
  const [referrerName, setReferrerName] = useState("");
  const timerRef = useRef(null);

  // Keep parent state in sync
  useEffect(() => {
    if (value !== raw) { setRaw(value || ""); }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    const raw = e.target.value;
    setRaw(raw);
    const code = extractCode(raw);
    onChange(code);
    clearTimeout(timerRef.current);
    if (!code) { setStatus(null); setReferrerName(""); return; }
    if (code.length < 6) { setStatus(null); return; }
    setStatus("checking");
    timerRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/auth/referral/${encodeURIComponent(code)}`);
        setReferrerName(data.name || "");
        setStatus("valid");
      } catch {
        setStatus("invalid");
        setReferrerName("");
      }
    }, 500);
  }

  const displayCode = extractCode(raw);

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="label" style={{ marginBottom: 6 }}>
        Referral code or link{" "}
        <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span>
      </div>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          placeholder="Paste a code like UMP-A1B2C3D4 or a referral link"
          value={raw}
          onChange={handleChange}
          style={{ paddingRight: status === "checking" ? 40 : 14 }}
        />
        {status === "checking" && (
          <i className="fas fa-spinner fa-spin" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", fontSize: "1.2rem" }} />
        )}
      </div>
      {status === "valid" && displayCode && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "#16a34a" }}>
          <i className="fas fa-circle-check" />
          <span>Valid code <strong>{displayCode}</strong>{referrerName ? ` — referred by ${referrerName}` : ""}</span>
        </div>
      )}
      {status === "invalid" && displayCode && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "var(--ink-3)" }}>
          <i className="fas fa-circle-xmark" />
          <span>Code not found — you can still sign up without one</span>
        </div>
      )}
    </div>
  );
}

const SCHOOL_MAIL_STEPS = [
  { n: 1, text: "Go to portal.office.com and click Sign in" },
  { n: 2, text: "Enter your matric number as your email, e.g. 190401234@live.unilag.edu.ng" },
  { n: 3, text: "Use the temporary password sent to you by UNILAG (ABS-CITS)" },
  { n: 4, text: "You'll be asked to change your password and set up recovery options" },
  { n: 5, text: "Once in, open Outlook — your OTP from UMP will arrive there" },
];

function SchoolMailGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 6, marginBottom: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontSize: "1.2rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
      >
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: "0.9rem" }} />
        How do I get my UNILAG school email?
      </button>
      {open && (
        <div style={{ marginTop: 10, padding: "14px 16px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.2)", borderRadius: "var(--r-lg)" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink-1)", marginBottom: 10 }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 7, color: "var(--accent)" }} />
            Setting up your UNILAG student email
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            {SCHOOL_MAIL_STEPS.map((s) => (
              <li key={s.n} style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{s.text}</li>
            ))}
          </ol>
          <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(249,115,22,.1)", borderRadius: "var(--r-md)", fontSize: "1.15rem", color: "var(--ink-2)" }}>
            <i className="fas fa-info-circle" style={{ marginRight: 5, color: "var(--accent)" }} />
            Your matric number is on your UNILAG ID card or admission letter.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser } = useUser();
  const [tab, setTab] = useState("signin");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [remember, setRemember] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const email = matric.trim() ? `${matric.trim()}${DOMAIN}` : "";

  function validatePassword() {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character";
    if (password !== confirm) return "Passwords don't match";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!matric.trim()) { setError("Please enter your matric number"); return; }

    if (tab === "signup") {
      const pwErr = validatePassword();
      if (pwErr) { setError(pwErr); return; }
      if (!termsAgreed) { setError("Please read and agree to our Terms of Service and Privacy Policy before creating an account."); return; }
    }

    setLoading(true);
    try {
      const endpoint = tab === "signin" ? "/api/auth/login" : "/api/auth/signup";
      const body = tab === "signin" ? { email, password } : { name, email, password, ...(referralCode.trim() && { referralCode: referralCode.trim().toUpperCase() }) };
      const data = await apiFetch(endpoint, { method: "POST", body });
      if (tab === "signup") {
        try { sessionStorage.setItem("ump_otp_email", email); } catch { /* ignore */ }
        navigate("/auth", { state: { email } });
        return;
      }
      if (data.token) setToken(data.token);
      setUser(data.user || data);
      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t) { setTab(t); setError(""); setPassword(""); setConfirm(""); setTermsAgreed(false); if (t === "signin") setReferralCode(""); }

  async function finishGoogleAuth(result) {
    const idToken = await result.user.getIdToken();
    const body = { idToken };
    if (referralCode?.trim()) body.referralCode = referralCode.trim().toUpperCase();
    const data = await apiFetch("/api/auth/google", { method: "POST", body });
    if (data.token) setToken(data.token);
    setUser(data.user || data);
    if (data.user?.isLimitedAccount || data.isLimitedAccount) {
      setError("__limited__");
      setGoogleLoading(false);
      return;
    }
    navigate(routeState?.from || "/");
  }

  // Handle result when browser falls back to redirect sign-in
  useEffect(() => {
    let active = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result || !active) return;
        setGoogleLoading(true);
        await finishGoogleAuth(result);
      })
      .catch((err) => {
        if (!active) return;
        if (err?.code !== "auth/popup-closed-by-user") {
          setError(err?.message || "Google sign-in failed");
        }
        setGoogleLoading(false);
      });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogleClick() {
    setError("");
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      await finishGoogleAuth(result);
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user") {
        setGoogleLoading(false);
      } else if (err?.code === "auth/popup-blocked") {
        // Browser blocked the popup — silently fall back to redirect
        try {
          await signInWithRedirect(auth, provider);
          // Page will reload after redirect; loading stays true intentionally
        } catch (redirectErr) {
          setError(redirectErr?.message || "Google sign-in failed. Please try again.");
          setGoogleLoading(false);
        }
      } else {
        setError(err?.message || "Google sign-in failed");
        setGoogleLoading(false);
      }
    }
  }

  const pwOk = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    num: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password && confirm && password === confirm,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="icon-btn" style={{ background: "var(--surface)" }} onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" />
        </button>
        <Logo />
        <span style={{ width: 40 }} />
      </div>

      {/* Card wrapper — centers on desktop */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8px 16px 40px" }}>
        <div style={{ width: "100%", maxWidth: 460, background: "var(--white)", borderRadius: "var(--r-2xl)", boxShadow: "0 4px 32px rgba(0,0,0,.07)", padding: "28px 28px 32px" }}>

          {/* Verified success banner */}
          {routeState?.verified && (
            <div style={{ marginBottom: 20, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 10, fontSize: "1.3rem", color: "#15803d" }}>
              <i className="fas fa-circle-check" />
              <div>
                <div style={{ fontWeight: 700 }}>Email verified!</div>
                <div style={{ fontSize: "1.15rem" }}>Your account is ready — sign in to continue.</div>
              </div>
            </div>
          )}

          {/* Heading */}
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            {tab === "signin" ? "Welcome back 👋" : "Join the campus"}
          </h1>
          <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: "1.3rem" }}>
            {tab === "signin" ? "Sign in with your UNILAG matric number." : "Create your student account in under a minute."}
          </p>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: "var(--surface)", borderRadius: "var(--r-pill)", padding: 4, marginBottom: 24 }}>
            {["signin", "signup"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: "var(--r-pill)", fontWeight: 700,
                  fontSize: "1.35rem", border: "none", cursor: "pointer", transition: "all .2s",
                  background: tab === t ? "var(--white)" : "transparent",
                  color: tab === t ? "var(--ink-1)" : "var(--ink-3)",
                  boxShadow: tab === t ? "0 2px 8px rgba(0,0,0,.10)" : "none",
                }}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full name — signup only */}
            {tab === "signup" && (
              <div style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 6 }}>Full name</div>
                <input
                  className="input"
                  placeholder="e.g. Aisha Ogundimu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Email — matric number + fixed domain suffix */}
            <div style={{ marginBottom: 16 }}>
              <div className="label" style={{ marginBottom: 6 }}>Email</div>
              <div style={{ display: "flex", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--white)", transition: "border-color .2s" }}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--line)"}
              >
                <input
                  style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: "1.4rem", fontFamily: "var(--font-sans)", background: "transparent", color: "var(--ink-1)", minWidth: 0 }}
                  placeholder="matric number"
                  value={matric}
                  onChange={(e) => setMatric(e.target.value.replace(/\s/g, ""))}
                  required
                />
                <div style={{ padding: "0 14px", background: "var(--surface)", borderLeft: "1.5px solid var(--line)", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: "1.25rem", color: "var(--ink-2)", fontWeight: 500, flexShrink: 0 }}>
                  {DOMAIN}
                </div>
              </div>
            </div>
            {tab === "signup" && <SchoolMailGuide />}

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <div className="label" style={{ marginBottom: 6 }}>Password</div>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="icon-btn" onClick={() => setShow(!show)}
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>
                  <i className={`far fa-${show ? "eye-slash" : "eye"}`} />
                </button>
              </div>

              {/* Live strength + rules — only on signup, shown as soon as user starts typing */}
              {tab === "signup" && password.length > 0 && (
                <>
                  <StrengthBar pwd={password} />
                  <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", gap: 6 }}>
                    <Rule ok={pwOk.len}     text="At least 8 characters" />
                    <Rule ok={pwOk.upper}   text="One uppercase letter (A–Z)" />
                    <Rule ok={pwOk.num}     text="One number (0–9)" />
                    <Rule ok={pwOk.special} text="One special character (!@#$…)" />
                  </div>
                </>
              )}
            </div>

            {/* Confirm password — signup only */}
            {tab === "signup" && (
              <div style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 6 }}>Confirm password</div>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" className="icon-btn" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>
                    <i className={`far fa-${showConfirm ? "eye-slash" : "eye"}`} />
                  </button>
                </div>
                {confirm.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <Rule ok={pwOk.match} text="Passwords match" />
                  </div>
                )}
              </div>
            )}

            {/* Remember me / forgot — signin only */}
            {tab === "signin" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: "var(--ink-2)", cursor: "pointer" }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>
                <span style={{ fontSize: "1.2rem", color: "var(--accent)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/forgot-password")}>
                  Forgot password?
                </span>
              </div>
            )}

            {/* Error / limited-account warning */}
            {error === "__limited__" ? (
              <div style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.3)", borderRadius: "var(--r-md)", fontSize: "1.3rem" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>Limited account</div>
                    <div style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>
                      You're signed in, but this is not a UNILAG student email. You can <strong>browse and buy</strong> products, but you <strong>cannot sell, list, or offer services</strong> until you link your school email.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ flex: 1, background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "1.25rem", padding: "8px 0" }}
                    onClick={() => navigate("/settings?tab=verify")}
                  >
                    Link school email
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    style={{ flex: 1, borderRadius: 8, fontSize: "1.25rem", padding: "8px 0" }}
                    onClick={() => navigate(routeState?.from || "/")}
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            ) : error ? (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)", color: "var(--danger)", borderRadius: "var(--r-md)", fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fas fa-circle-exclamation" />
                {error}
              </div>
            ) : null}

            {/* Referral code / link — signup only */}
            {tab === "signup" && (
              <ReferralInput value={referralCode} onChange={setReferralCode} />
            )}

            {/* T&C checkbox — signup only */}
            {tab === "signup" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer", padding: "12px 14px", background: "var(--surface)", borderRadius: "var(--r-md)", border: `1.5px solid ${termsAgreed ? "var(--accent)" : "var(--line)"}`, transition: "border-color .2s" }}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 2, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
                  I have read and agree to UMP's{" "}
                  <span
                    style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                    onClick={(e) => { e.preventDefault(); navigate("/terms"); }}
                  >
                    Terms of Service
                  </span>
                  {" "}and{" "}
                  <span
                    style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
                    onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}
                  >
                    Privacy Policy
                  </span>
                </span>
              </label>
            )}

            {/* Submit */}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading || (tab === "signup" && !termsAgreed)} style={{ borderRadius: "var(--r-pill)" }}>
              {loading
                ? <i className="fas fa-spinner fa-spin" />
                : <>{tab === "signin" ? "Sign in" : "Create account"} <i className="fas fa-arrow-right" /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ color: "var(--ink-3)", fontSize: "1.1rem", fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <button
            type="button"
            className="btn btn-light btn-block"
            style={{ gap: 10 }}
            onClick={handleGoogleClick}
            disabled={googleLoading || loading}
          >
            {googleLoading
              ? <i className="fas fa-spinner fa-spin" />
              : <><i className="fab fa-google" /> Continue with Google</>}
          </button>

          {tab === "signin" && (
            <p style={{ textAlign: "center", marginTop: 20, fontSize: "1.15rem", color: "var(--ink-3)" }}>
              By signing in you agree to our{" "}
              <span style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/terms")}>Terms</span> &amp;{" "}
              <span style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/privacy")}>Privacy Policy</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
