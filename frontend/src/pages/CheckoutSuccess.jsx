import { useNavigate, useLocation } from "react-router-dom";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const order = state?.order;
  const ref = order?.orderRef || order?._id || "UMP-" + Math.floor(Math.random() * 90000 + 10000);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", padding: "60px 24px 0", textAlign: "center" }}>
      <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", margin: "0 auto" }}>
        <i className="fas fa-bag-shopping" />
      </div>
      <h1 style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "24px 0 8px" }}>Order placed!</h1>
      <p style={{ margin: 0, color: "var(--ink-2)", fontSize: "1.4rem" }}>Sit tight — we'll notify you when the seller confirms.</p>
      <div className="card" style={{ padding: 16, margin: "24px auto", maxWidth: 360, textAlign: "left" }}>
        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>Order ref</div>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "monospace" }}>#{ref}</div>
      </div>
      <div style={{ maxWidth: 360, margin: "0 auto" }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate("/")}>Back to home</button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate("/orders")}>View my orders</button>
      </div>
    </div>
  );
}
