import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";
import { naira } from "../components/ProductCard";
import { useToast } from "../context/ToastContext";

export default function PayForCart() {
  const { token } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    fetch(`${API_BASE}/api/payments/cart-link/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) setError(d.message || "Link not found.");
        else setDetails(d);
      })
      .catch(() => setError("Failed to load payment details."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handlePay(e) {
    e.preventDefault();
    if (!form.email.trim()) { showToast("Your email is required", "error"); return; }
    setPaying(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/cart-link/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerName: form.name, payerEmail: form.email, payerPhone: form.phone }),
      });
      const data = await res.json();
      if (!data.success || !data.payment_link) throw new Error(data.message || "No payment link returned");
      window.location.href = data.payment_link;
    } catch (err) {
      showToast(err.message || "Failed to initialize payment.", "error");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "2.4rem", color: "var(--accent)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <i className="fas fa-link-slash" style={{ fontSize: "3rem", color: "var(--ink-4)" }} />
        <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-1)", textAlign: "center" }}>{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate("/")}>Go to UMP</button>
      </div>
    );
  }

  const expires = details?.expiresAt ? new Date(details.expiresAt) : null;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--paper)", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ background: "var(--navy-800)", padding: "20px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>UMP Marketplace</div>
        <div style={{ fontSize: "1.3rem", color: "rgba(255,255,255,.7)" }}>
          Pay for <strong style={{ color: "#fff" }}>{details.ownerName || "someone"}</strong>'s cart
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 0" }}>

        {/* Item list */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
            <i className="fas fa-bag-shopping" style={{ marginRight: 8, color: "var(--accent)" }} />
            Items ({details.items.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {details.items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {it.image ? (
                  <img src={it.image} alt={it.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--surface)", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>× {it.quantity}</div>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, flexShrink: 0 }}>{naira(it.price * it.quantity)}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "var(--line)", margin: "14px 0 10px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 6 }}>
            <span>Subtotal</span><span>{naira(details.subtotal)}</span>
          </div>
          {details.serviceCharge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 6 }}>
              <span>Service charge</span><span>{naira(details.serviceCharge)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(details.total)}</span>
          </div>
        </div>

        {/* Payer info form */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>Your details</div>
          <form onSubmit={handlePay}>
            <div className="label">Full name (optional)</div>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Aisha Ogundimu" style={{ marginBottom: 12 }} />
            <div className="label">Email address *</div>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" style={{ marginBottom: 12 }} />
            <div className="label">Phone (optional)</div>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+234 813 555 7724" style={{ marginBottom: 16 }} />
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={paying} style={{ borderRadius: "var(--r-pill)" }}>
              {paying ? <><i className="fas fa-spinner fa-spin" /> Connecting to Flutterwave…</> : <><i className="fas fa-lock" /> Pay {naira(details.total)}</>}
            </button>
          </form>
        </div>

        {/* Expiry + trust note */}
        {expires && (
          <p style={{ textAlign: "center", fontSize: "1.2rem", color: "var(--ink-4)", margin: "0 0 8px" }}>
            <i className="fas fa-clock" style={{ marginRight: 5 }} />
            Link expires {expires.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        <p style={{ textAlign: "center", fontSize: "1.15rem", color: "var(--ink-4)" }}>
          <i className="fas fa-shield-halved" style={{ marginRight: 5 }} />Secured by Flutterwave · UMP Marketplace
        </p>
      </div>
    </div>
  );
}

// ─── Payment success page for cart links ──────────────────────────────────────
export function PayForCartSuccess() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24, textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="fas fa-circle-check" style={{ fontSize: "3rem", color: "#16a34a" }} />
      </div>
      <div>
        <div style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 8 }}>Payment sent!</div>
        <div style={{ fontSize: "1.4rem", color: "var(--ink-2)" }}>The cart owner will receive their orders shortly.</div>
      </div>
      <button className="btn btn-primary" onClick={() => navigate("/")}>Go to UMP</button>
    </div>
  );
}
