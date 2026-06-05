import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import Ph from "./Ph";

export default function NegotiationModal({ itemType, itemId, itemName, itemImage, originalPrice, sellerId, onClose }) {
  const navigate = useNavigate();
  const [proposed, setProposed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const currency = "₦";
  const formatted = (n) => currency + Number(n).toLocaleString("en-NG");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const val = Number(proposed);
    if (!val || val <= 0) { setError("Enter a valid price."); return; }
    if (val >= originalPrice) { setError(`Your offer must be below ${formatted(originalPrice)}.`); return; }
    if (val < originalPrice * 0.1) { setError("Offer is too low — must be at least 10% of the original price."); return; }

    setLoading(true);
    try {
      await apiFetch("/api/negotiations", {
        method: "POST",
        body: { itemType, itemId, proposedPrice: val, sellerId },
      });
      setDone(true);
    } catch (err) {
      if (err?.status === 401) {
        onClose();
        navigate("/login");
      } else if (err?.status === 409) {
        setError("You already have a pending negotiation for this item. Check your messages.");
      } else {
        setError(err?.body?.message || err?.message || "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 90 }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--white)", borderRadius: "24px 24px 0 0",
        padding: "24px 20px 40px", zIndex: 100,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Negotiate Price</h3>
            <p style={{ margin: "4px 0 0", fontSize: "1.2rem", color: "var(--ink-3)" }}>
              Send your offer to the {itemType === "Service" ? "provider" : "seller"}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="fas fa-check" style={{ fontSize: "2rem", color: "#16a34a" }} />
            </div>
            <h4 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 8px" }}>Offer sent!</h4>
            <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", margin: "0 0 20px" }}>
              {itemType === "Service"
                ? "Your offer has been sent to the provider. Once they accept, you'll see a \"Book at negotiated price\" button in your messages to book the session at your agreed rate."
                : "Your negotiation request has been sent. Check your messages for the seller's response."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Close</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); navigate("/messages"); }}>
                <i className="fas fa-comment" /> View messages
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Item preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: "1px solid var(--line)", borderRadius: "var(--r-lg)", marginBottom: 20, background: "var(--surface)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "var(--line)" }}>
                {itemImage
                  ? <img src={itemImage} alt={itemName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Ph kind="default" label="" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemName}</div>
                <div style={{ fontSize: "1.3rem", color: "var(--ink-3)" }}>
                  Listed at <span style={{ fontWeight: 700, color: "var(--accent)" }}>{formatted(originalPrice)}</span>
                  {itemType === "Service" && <span style={{ fontSize: "1.1rem" }}> /session</span>}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="label" style={{ marginBottom: 8, display: "block" }}>Your offer</label>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-2)", pointerEvents: "none" }}>₦</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input"
                  style={{ paddingLeft: 30, fontSize: "1.6rem", fontWeight: 700 }}
                  placeholder="0"
                  value={proposed}
                  onChange={(e) => { setProposed(e.target.value); setError(""); }}
                  autoFocus
                />
              </div>

              {proposed && Number(proposed) > 0 && Number(proposed) < originalPrice && (
                <p style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 8 }}>
                  You're saving <span style={{ fontWeight: 700, color: "#16a34a" }}>{formatted(originalPrice - Number(proposed))}</span>{" "}
                  ({Math.round((1 - Number(proposed) / originalPrice) * 100)}% off)
                </p>
              )}

              {error && (
                <p style={{ fontSize: "1.25rem", color: "#ef4444", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fas fa-circle-exclamation" /> {error}
                </p>
              )}

              <p style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginBottom: 20, lineHeight: 1.6 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 5, color: "var(--accent)" }} />
                {itemType === "Service"
                  ? "If the provider accepts, you'll get a button in your messages to book the session at your negotiated rate."
                  : "If the seller accepts, the original price remains until they apply the negotiated price to your cart."}
              </p>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading || !proposed}
              >
                {loading
                  ? <><i className="fas fa-spinner fa-spin" /> Sending…</>
                  : <><i className="fas fa-handshake" /> Send offer</>}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
