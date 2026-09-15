import { useState } from "react";
import { apiFetch } from "../utils/api";

const REASONS = [
  "Too expensive",
  "Out of stock",
  "Wrong category / not relevant",
  "Just browsing",
];

/**
 * "Can't find it?" prompt — shown by useDiscoverySurvey after a minute of
 * scrolling with no product found. Feeds admins a demand signal (Feedback
 * model) so they know what to source next.
 *
 * Props:
 *   context     — which page this fired from ("market" | "search")
 *   searchQuery — the active search term, if any
 *   onClose     — dismiss the modal (also marks it shown-for-this-session)
 */
export default function DiscoverySurveyModal({ context = "market", searchQuery = "", onClose }) {
  const [reason, setReason]   = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!message.trim()) { setError("Let us know what you're looking for"); return; }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        body: { message: message.trim(), reason, context, searchQuery },
      });
      setDone(true);
    } catch (err) {
      setError(err?.message || "Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--paper)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, padding: 24, paddingBottom: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <i className="fas fa-check" style={{ fontSize: "1.8rem", color: "#16a34a" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.8rem", fontWeight: 800 }}>Thanks — noted!</h3>
            <p style={{ margin: "0 0 24px", fontSize: "1.3rem", color: "var(--ink-3)", lineHeight: 1.5 }}>
              We'll use this to bring in more of what students actually need.
            </p>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Still looking for something?</h3>
                <p style={{ margin: "3px 0 0", fontSize: "1.3rem", color: "var(--ink-3)" }}>Tell us what you need — it helps us get the right sellers and products on UMP.</p>
              </div>
              <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
            </div>

            <form onSubmit={submit} style={{ marginTop: 14 }}>
              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                What are you trying to find?
              </label>
              <textarea
                className="input"
                placeholder="e.g. A used calculator for engineering courses…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{ width: "100%", resize: "none", marginBottom: 14 }}
                autoFocus
              />

              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                What's getting in the way? <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={reason === r}
                    onClick={() => setReason(reason === r ? "" : r)}
                    style={{ padding: "7px 12px", borderRadius: 20, fontSize: "1.2rem", cursor: "pointer", border: `1px solid ${reason === r ? "var(--accent)" : "var(--line)"}`, background: reason === r ? "rgba(var(--accent-rgb),.08)" : "transparent", color: reason === r ? "var(--accent)" : "var(--ink-2)", fontFamily: "inherit" }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: "1.2rem", color: "#dc2626", marginBottom: 14 }}>
                  <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Not now</button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, borderRadius: "var(--r-pill)", height: 48, fontWeight: 700, fontSize: "1.4rem", opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? <i className="fas fa-spinner fa-spin" /> : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
