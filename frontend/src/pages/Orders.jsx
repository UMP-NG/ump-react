import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function downloadReceipt(o, onPopupBlocked) {
  if (!o) return;
  const fmt = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 });
  const orderId = esc((o._id || o.id || "").toString().slice(-10).toUpperCase());
  const date = new Date(o.createdAt || Date.now()).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" });
  const rows = (o.items || []).map((item) => {
    const p = item.product || item;
    const qty = item.quantity || 1;
    return `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #e5e7eb">${esc(p.name || "Product")}</td>
      <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:center">${qty}</td>
      <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right">${fmt((p.price || 0) * qty)}</td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>UMP Receipt #${orderId}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111}
.logo{font-size:22px;font-weight:900;color:#f97316}
.divider{border:none;border-top:2px solid #e5e7eb;margin:18px 0}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;padding-bottom:6px}
.total-row{font-weight:700;font-size:16px}
.footer{margin-top:32px;font-size:12px;color:#9ca3af;text-align:center}
@media print{body{padding:16px}}
</style></head><body>
<div class="logo">UMP</div>
<p style="margin:2px 0;color:#6b7280;font-size:13px">University Marketplace · UNILAG</p>
<hr class="divider">
<h2 style="margin:0 0 4px">Payment Receipt</h2>
<p style="margin:2px 0;font-size:13px;color:#374151">Order #${orderId}</p>
<p style="margin:2px 0;font-size:13px;color:#374151">Date: ${date}</p>
<p style="margin:2px 0;font-size:13px;color:#374151">Status: <strong>${esc(o.status)}</strong> · Payment: <strong>${esc(o.paymentStatus)}</strong></p>
<hr class="divider">
<table>
  <thead><tr>
    <th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<hr class="divider">
<table>
  <tr><td style="padding:4px 0;color:#6b7280">Subtotal</td><td style="text-align:right">${fmt(o.subtotal || o.totalAmount)}</td></tr>
  ${o.deliveryFee > 0 ? `<tr><td style="padding:4px 0;color:#6b7280">Delivery fee</td><td style="text-align:right">${fmt(o.deliveryFee)}</td></tr>` : ""}
  <tr class="total-row"><td style="padding:8px 0">Total paid</td><td style="text-align:right;color:#f97316">${fmt(o.totalAmount)}</td></tr>
</table>
${o.shippingAddress?.address ? `<hr class="divider"><p style="margin:4px 0;font-size:13px"><strong>Delivered to:</strong> ${esc(o.shippingAddress.name || "")}, ${esc(o.shippingAddress.address)}${o.shippingAddress.city ? ", " + esc(o.shippingAddress.city) : ""}</p>` : ""}
<div class="footer"><p>Thank you for shopping on UMP — University Marketplace</p><p style="margin-top:4px">Generated ${new Date().toLocaleString()}</p></div>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    onPopupBlocked?.();
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  if (win.document.readyState === "complete") {
    win.print();
  } else {
    win.addEventListener("load", () => win.print());
  }
}
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import Skel from "../components/Skel";

const STATUS_TABS = ["All", "Active", "Delivered", "Cancelled"];
const STATUS_STYLE = {
  pending:            { bg: "#fef3c7", color: "#d97706" },
  confirmed:          { bg: "#dbeafe", color: "#1d4ed8" },
  shipped:            { bg: "#e0f2fe", color: "#0284c7" },
  completed:          { bg: "#dcfce7", color: "#16a34a" },
  delivered:          { bg: "#dcfce7", color: "#16a34a" },
  cancelled:          { bg: "#fee2e2", color: "#dc2626" },
  "pending-verification": { bg: "#f3e8ff", color: "#7c3aed" },
};

const STATUS_STEPS = ["pending", "confirmed", "shipped", "completed"];
function OrderTimeline({ status }) {
  if (status === "cancelled") return null;
  const idx = STATUS_STEPS.indexOf(status);
  if (idx < 0) return null;
  const labels = ["Placed", "Confirmed", "Shipped", "Delivered"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "12px 0 4px" }}>
      {STATUS_STEPS.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: done ? (active ? "var(--accent)" : "#16a34a") : "var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <i className={`fas fa-${done ? "check" : "circle"}`} style={{ fontSize: "1rem", color: done ? "#fff" : "var(--ink-4)" }} />
              </div>
              <span style={{ fontSize: "1rem", color: done ? "var(--ink-1)" : "var(--ink-4)", fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{labels[i]}</span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? "#16a34a" : "var(--line)", margin: "0 4px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const DISPUTE_REASONS = [
  "Item not received",
  "Item not as described",
  "Damaged or defective item",
  "Wrong item sent",
  "Seller unresponsive",
  "Other",
];

function DisputeModal({ order, onClose, onDone }) {
  const showToast = useToast();
  const [reason, setReason]       = useState(DISPUTE_REASONS[0]);
  const [description, setDesc]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/orders/${order._id || order.id}/dispute`, {
        method: "POST",
        body: { reason, description },
      });
      showToast("Dispute raised — our team will review it within 48 hours", "success");
      onDone();
    } catch (err) {
      showToast(err.message || "Failed to raise dispute", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--paper)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 540, padding: 24, paddingBottom: 36 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Raise a Dispute</h3>
            <p style={{ margin: "4px 0 0", fontSize: "1.2rem", color: "var(--ink-3)" }}>Order #{(order._id || order.id)?.toString().slice(-6)}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>

        <div style={{ padding: "10px 12px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <i className="fas fa-triangle-exclamation" style={{ color: "#dc2626", marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
            Raising a dispute will flag this order for admin review. Our team typically responds within 48 hours. Please message the seller first to try to resolve the issue.
          </p>
        </div>

        <form onSubmit={submit}>
          <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Reason</label>
          <select
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: "100%", marginBottom: 14, height: 44 }}
          >
            {DISPUTE_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>

          <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Details <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
          <textarea
            className="input"
            placeholder="Describe the issue in more detail…"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{ width: "100%", resize: "none", marginBottom: 18 }}
          />
          <button className="btn btn-block" type="submit" disabled={submitting}
            style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "var(--r-pill)", height: 48, fontWeight: 700, fontSize: "1.4rem", cursor: "pointer" }}>
            {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-flag" /> Submit Dispute</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function ReviewModal({ order, onClose, onDone }) {
  const showToast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const productId = order.items?.[0]?.product?._id || order.items?.[0]?.product || order.items?.[0]?._id;

  async function submit(e) {
    e.preventDefault();
    if (!productId) { showToast("Cannot identify product to review", "error"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      showToast("Review submitted — thank you!", "success");
      onDone();
    } catch (err) {
      showToast(err.message || "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--paper)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 540, padding: 24, paddingBottom: 36 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Write a Review</h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "center" }}>
            {[1,2,3,4,5].map((s) => (
              <i
                key={s}
                className={`fa${s <= rating ? "s" : "r"} fa-star`}
                style={{ fontSize: "2.8rem", color: s <= rating ? "#f59e0b" : "var(--ink-4)", cursor: "pointer" }}
                onClick={() => setRating(s)}
              />
            ))}
          </div>
          <textarea
            className="input"
            placeholder="Share your experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            style={{ width: "100%", resize: "none", marginBottom: 16 }}
          />
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? <i className="fas fa-spinner fa-spin" /> : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [filter, setFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cancelling, setCancelling]   = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [disputeOrder, setDisputeOrder] = useState(null);

  useEffect(() => {
    apiFetch("/api/orders/me")
      .then((d) => setOrders(Array.isArray(d?.orders) ? d.orders : Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "All") return true;
    if (filter === "Active") return !["completed", "delivered", "cancelled"].includes(o.status);
    if (filter === "Delivered") return ["completed", "delivered"].includes(o.status);
    if (filter === "Cancelled") return o.status === "cancelled";
    return true;
  });

  async function cancelOrder(orderId) {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}`, { method: "DELETE" });
      setOrders((prev) => prev.map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status: "cancelled" } : o));
      showToast("Order cancelled", "success");
    } catch (err) {
      showToast(err.message || "Could not cancel order", "error");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>My Orders</h1>
      </div>

      <div style={{ padding: "12px 16px 0", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {STATUS_TABS.map((s) => (
          <span key={s} className={`chip${filter === s ? " active" : ""}`} style={{ cursor: "pointer" }} onClick={() => setFilter(s)}>{s}</span>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <Skel.OrderCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <i className="fas fa-box-open" style={{ fontSize: "4rem", color: "var(--ink-4)", marginBottom: 16 }} />
            <p style={{ fontSize: "1.6rem", color: "var(--ink-2)" }}>No orders yet</p>
            <button className="btn btn-primary" onClick={() => navigate("/market")}>Start shopping</button>
          </div>
        ) : (
          filtered.map((o) => {
            const orderId = o._id || o.id;
            const isOpen = expanded === orderId;
            const statusStyle = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
            const isCompleted = ["completed", "delivered"].includes(o.status);
            return (
              <div key={orderId} className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
                <div style={{ padding: 14, display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : orderId)}>
                  <div style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                    {(() => {
                      const firstItem = (o.items || [])[0];
                      const p = firstItem?.product || firstItem;
                      const img = getImageUrl(p?.images?.[0]);
                      return img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Ph kind={p?.category?.name?.toLowerCase() || "default"} />;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>Order #{orderId.toString().slice(-6)}</div>
                        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>
                          {new Date(o.createdAt || Date.now()).toLocaleDateString()} · {(o.items || []).length} item{(o.items || []).length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: "1.1rem", padding: "2px 8px", borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{o.status}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{naira(o.totalAmount || o.total || 0)}</div>
                    {["confirmed", "shipped", "pending-verification"].includes(o.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDisputeOrder(o); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0, fontFamily: "var(--font-sans)" }}
                      >
                        <i className="fas fa-flag" style={{ fontSize: "0.9rem" }} /> Issue?
                      </button>
                    )}
                  </div>
                  </div>
                  <i className={`fas fa-chevron-${isOpen ? "up" : "down"}`} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: 14 }}>
                    <OrderTimeline status={o.status} />

                    {/* Tracking number */}
                    {o.trackingNumber && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", marginBottom: 12 }}>
                        <i className="fas fa-truck" style={{ color: "#3b82f6", fontSize: "1.4rem", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600 }}>TRACKING NUMBER</div>
                          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1d4ed8" }}>{o.trackingNumber}</div>
                        </div>
                      </div>
                    )}

                    {/* Escrow notice */}
                    {o.paymentStatus === "paid" && !["completed", "cancelled"].includes(o.status) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", marginBottom: 12 }}>
                        <i className="fas fa-lock" style={{ color: "#3b82f6", fontSize: "1.4rem", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1d4ed8" }}>Payment held in escrow</div>
                          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Funds are secure with UMP and will be released to the seller once your order is delivered.</div>
                        </div>
                      </div>
                    )}

                    {/* Delivery code — shown to buyer when order is shipped/active */}
                    {o.deliveryCode && o.paymentStatus === "paid" && ["confirmed", "shipped"].includes(o.status) && (
                      <div style={{ padding: "14px 16px", borderRadius: "var(--r-lg)", background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", marginBottom: 12, position: "relative", overflow: "hidden" }}>
                        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.65)", fontWeight: 600, letterSpacing: ".06em", marginBottom: 6 }}>
                          <i className="fas fa-key" style={{ marginRight: 6 }} />DELIVERY CODE
                        </div>
                        <div style={{ fontSize: "3.2rem", fontWeight: 900, color: "#fff", letterSpacing: ".18em", fontFamily: "monospace" }}>{o.deliveryCode}</div>
                        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.55)", marginTop: 6 }}>
                          Share this code with the seller when you receive your order. The seller will enter it to confirm delivery and receive payment.
                        </div>
                      </div>
                    )}

                    {/* Refund notice */}
                    {o.status === "cancelled" && o.refund?.status === "requested" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", marginBottom: 12 }}>
                        <i className="fas fa-rotate-left" style={{ color: "#dc2626", fontSize: "1.4rem", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#dc2626" }}>Refund initiated — {naira(o.refund.amount)}</div>
                          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Your refund is being processed. This typically takes 1–3 business days.</div>
                        </div>
                      </div>
                    )}

                    {/* Completed */}
                    {isCompleted && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.2)", marginBottom: 12 }}>
                        <i className="fas fa-circle-check" style={{ color: "#16a34a", fontSize: "1.4rem", flexShrink: 0 }} />
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#16a34a" }}>Order completed — thank you for your purchase!</div>
                      </div>
                    )}

                    <h4 style={{ margin: "0 0 10px", fontSize: "1.3rem", fontWeight: 700 }}>Items</h4>
                    {(o.items || []).map((item, i) => {
                      const p = item.product || item;
                      const itemImg = getImageUrl(p?.images?.[0]);
                      return (
                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                          <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                            {itemImg
                              ? <img src={itemImg} alt={p?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <Ph kind={p?.category?.name?.toLowerCase() || "default"} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{p.name || "Product"}</div>
                            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>× {item.quantity || 1} · {naira((p.price || 0) * (item.quantity || 1))}</div>
                          </div>
                        </div>
                      );
                    })}

                    {o.shippingAddress?.address && (
                      <div style={{ marginTop: 10, padding: 10, background: "var(--surface)", borderRadius: "var(--r-md)" }}>
                        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>DELIVERY ADDRESS</div>
                        <div style={{ fontSize: "1.2rem" }}>{o.shippingAddress.address}{o.shippingAddress.city ? `, ${o.shippingAddress.city}` : ""}</div>
                      </div>
                    )}

                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => {
                          const sellerId = o.seller?._id || o.seller;
                          if (sellerId) navigate(`/messages?with=${sellerId}`);
                          else navigate("/messages");
                        }}>
                        <i className="fas fa-message" /> Message seller
                      </button>
                      {(o.paymentStatus === "paid" || o.paymentStatus === "released" || isCompleted) && (
                        <button className="btn btn-sm btn-ghost" onClick={() => downloadReceipt(o, () => showToast("Allow pop-ups to download your receipt", "error"))}>
                          <i className="fas fa-download" /> Receipt
                        </button>
                      )}
                      {isCompleted && (
                        <button className="btn btn-sm btn-ghost" onClick={() => setReviewOrder(o)}>
                          <i className="fas fa-star" /> Write a Review
                        </button>
                      )}
                      {o.status === "pending" && (
                        <button
                          className="btn btn-sm"
                          style={{ color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }}
                          disabled={cancelling === orderId}
                          onClick={() => cancelOrder(orderId)}
                        >
                          {cancelling === orderId
                            ? <i className="fas fa-spinner fa-spin" />
                            : <><i className="fas fa-xmark" /> Cancel order</>}
                        </button>
                      )}
                      {["confirmed", "shipped", "pending-verification"].includes(o.status) && (
                        <button
                          className="btn btn-sm"
                          style={{ color: "#dc2626", border: "1px solid rgba(220,38,38,.4)", background: "rgba(220,38,38,.05)" }}
                          onClick={() => setDisputeOrder(o)}
                        >
                          <i className="fas fa-flag" /> Raise Dispute
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {reviewOrder && (
        <ReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onDone={() => setReviewOrder(null)}
        />
      )}

      {disputeOrder && (
        <DisputeModal
          order={disputeOrder}
          onClose={() => setDisputeOrder(null)}
          onDone={() => {
            setDisputeOrder(null);
            setOrders(prev => prev.map(o =>
              (o._id || o.id) === (disputeOrder._id || disputeOrder.id)
                ? { ...o, status: "disputed" }
                : o
            ));
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
