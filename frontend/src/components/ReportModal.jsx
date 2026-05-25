import { useState } from "react";
import { apiFetch } from "../utils/api";

const REASONS = [
  "Counterfeit / Fake item",
  "Prohibited or illegal item",
  "Misleading description or photos",
  "Spam or duplicate listing",
  "Inappropriate content",
  "Price gouging / Scam",
  "Fraudulent seller / account",
  "Harassment",
  "Other",
];

const MODEL_LABELS = {
  Product: "product",
  Listing: "listing",
  Service: "service",
  Seller:  "seller",
  User:    "user",
};

/**
 * ReportModal — reusable report sheet for any content type.
 *
 * Props:
 *   refModel  — "Product" | "Listing" | "Service" | "Seller" | "User"
 *   refId     — the ObjectId of the item being reported
 *   refName   — display name (shown in the header)
 *   onClose   — called to dismiss the modal
 */
export default function ReportModal({ refModel, refId, refName, onClose }) {
  const [reason, setReason]       = useState(REASONS[0]);
  const [description, setDesc]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: { refModel, refId, reason, description },
      });
      setDone(true);
    } catch (err) {
      setError(err?.message || "Failed to submit report. Please try again.");
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
          /* Success state */
          <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <i className="fas fa-check" style={{ fontSize: "1.8rem", color: "#16a34a" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.8rem", fontWeight: 800 }}>Report submitted</h3>
            <p style={{ margin: "0 0 24px", fontSize: "1.3rem", color: "var(--ink-3)", lineHeight: 1.5 }}>
              Our team will review this {MODEL_LABELS[refModel] || "content"} and take action if it violates our policies. Thank you for keeping UMP safe.
            </p>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </div>
        ) : (
          /* Form state */
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Report {MODEL_LABELS[refModel] || "content"}</h3>
                {refName && <p style={{ margin: "3px 0 0", fontSize: "1.2rem", color: "var(--ink-3)" }}>{refName}</p>}
              </div>
              <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
            </div>

            <div style={{ padding: "10px 12px", background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 10, marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <i className="fas fa-shield-halved" style={{ color: "#dc2626", marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                Reports are reviewed by our admin team. False reports may result in account action.
              </p>
            </div>

            <form onSubmit={submit}>
              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                Why are you reporting this?
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {REASONS.map((r) => (
                  <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: `1px solid ${reason === r ? "var(--accent)" : "var(--line)"}`, background: reason === r ? "rgba(var(--accent-rgb),.05)" : "transparent", cursor: "pointer", fontSize: "1.3rem", transition: "border-color .1s" }}>
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      style={{ accentColor: "var(--accent)", width: 16, height: 16, flexShrink: 0 }}
                    />
                    {r}
                  </label>
                ))}
              </div>

              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                Additional details <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span>
              </label>
              <textarea
                className="input"
                placeholder="Describe the issue in more detail…"
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                style={{ width: "100%", resize: "none", marginBottom: error ? 10 : 18 }}
              />

              {error && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: "1.2rem", color: "#dc2626", marginBottom: 14 }}>
                  <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
                </div>
              )}

              <button
                className="btn btn-block"
                type="submit"
                disabled={submitting}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "var(--r-pill)", height: 48, fontWeight: 700, fontSize: "1.4rem", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-flag" /> Submit Report</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
