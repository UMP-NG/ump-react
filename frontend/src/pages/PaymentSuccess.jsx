import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const flwTransactionId = searchParams.get("transaction_id");
  const flwStatus = searchParams.get("status");
  const reference = searchParams.get("reference") || searchParams.get("trxref") || searchParams.get("tx_ref");
  const isFlutterwave = !!flwTransactionId;

  const [status, setStatus] = useState("verifying");
  const [orders, setOrders] = useState([]); // [{ _id, storeName, totalAmount }]
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (isFlutterwave && flwStatus === "cancelled") {
      setStatus("failed");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const url = isFlutterwave
      ? `/api/payments/flw/verify?transaction_id=${encodeURIComponent(flwTransactionId)}`
      : reference
        ? `/api/payments/verify?reference=${encodeURIComponent(reference)}`
        : null;

    if (!url) { setStatus("failed"); return; }

    apiFetch(url, { signal: controller.signal })
      .then((d) => {
        clearTimeout(timer);
        if (d.status === "success") {
          setStatus("success");
          // Use rich order summaries if available, fall back to bare IDs
          if (d.orders?.length) {
            setOrders(d.orders);
          } else {
            const ids = d.orderIds || (d.orderId ? [d.orderId] : []);
            setOrders(ids.map((id) => ({ _id: id, storeName: "", totalAmount: null })));
          }
        } else {
          setStatus("failed");
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          setStatus("timeout");
        } else {
          setStatus("failed");
        }
      });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [flwTransactionId, flwStatus, reference, isFlutterwave]);

  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) { navigate("/orders"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, navigate]);

  if (status === "verifying") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: "3rem", color: "var(--accent)" }} />
        <p style={{ fontSize: "1.6rem", color: "var(--ink-2)" }}>Verifying your payment…</p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px 0", textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", marginBottom: 24 }}>
          <i className="fas fa-clock" />
        </div>
        <h1 style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Taking longer than expected</h1>
        <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", marginBottom: 8 }}>
          Your payment may still be processing. Check your orders page in a moment — it will update automatically once confirmed.
        </p>
        <p style={{ color: "var(--ink-3)", fontSize: "1.2rem", marginBottom: 32 }}>Reference: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{reference}</span></p>
        <div style={{ maxWidth: 360, width: "100%" }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate("/orders")}>Check my orders</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate("/market")}>Continue shopping</button>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px 0", textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", marginBottom: 24 }}>
          <i className="fas fa-xmark" />
        </div>
        <h1 style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Payment failed</h1>
        <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", marginBottom: 32 }}>
          Something went wrong. Your order has been saved — try paying again from your orders page.
        </p>
        <div style={{ maxWidth: 360, width: "100%" }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate("/orders")}>View my orders</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate("/cart")}>Back to cart</button>
        </div>
      </div>
    );
  }

  const isMultiSeller = orders.length > 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "60px 24px 32px", textAlign: "center", background: "linear-gradient(180deg, rgba(34,197,94,.08), transparent 60%)" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#22c55e", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", margin: "0 auto", boxShadow: "0 20px 40px -12px rgba(34,197,94,.5)" }}>
          <i className="fas fa-check" />
        </div>
        <h1 style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "24px 0 8px" }}>Payment successful!</h1>
        <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: "1.4rem" }}>
          {isMultiSeller
            ? `${orders.length} orders confirmed and held in escrow. Each seller has been notified.`
            : "Your order is confirmed and held in escrow. The seller has been notified."}
        </p>
        <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-3)" }}>
          Redirecting to your orders in {countdown}s…
        </p>

        {/* Per-order cards */}
        <div style={{ margin: "24px auto 0", maxWidth: isMultiSeller ? 520 : 360, display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((o) => (
            <div key={o._id?.toString()} className="card" style={{ padding: "16px 20px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  {o.storeName && (
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 2 }}>{o.storeName}</div>
                  )}
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Order ID</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "monospace" }}>#{o._id?.toString().slice(-10)}</div>
                </div>
                {o.totalAmount != null && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Amount</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>₦{o.totalAmount.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Payment reference + escrow note */}
          <div className="card" style={{ padding: "16px 20px", textAlign: "left" }}>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>Payment reference</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "monospace", wordBreak: "break-all", marginBottom: 12 }}>{reference}</div>
            <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", fontSize: "1.2rem", color: "#1d4ed8" }}>
              <i className="fas fa-lock" style={{ marginRight: 6 }} />
              {isMultiSeller
                ? "All payments are held in escrow and will be released to each seller independently after delivery."
                : "Your payment is held safely in escrow and will be released to the seller after delivery."}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 360, margin: "24px auto 0" }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate("/orders")}>
            <i className="fas fa-box-archive" /> View my orders
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => navigate("/market")}>
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
