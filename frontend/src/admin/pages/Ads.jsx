import { useState, useEffect } from "react";
import { apiFetch } from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { naira } from "../../components/ProductCard";

const AD_PLANS = {
  "3days":  { label: "Starter",  days: 3  },
  "7days":  { label: "Standard", days: 7  },
  "14days": { label: "Premium",  days: 14 },
};

const STATUS_COLOR = {
  active:          { bg: "rgba(34,197,94,.1)",   color: "#16a34a" },
  expired:         { bg: "rgba(107,114,128,.1)", color: "#6b7280" },
  cancelled:       { bg: "rgba(239,68,68,.1)",   color: "#dc2626" },
  pending_payment: { bg: "rgba(245,158,11,.1)",  color: "#d97706" },
};

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.expired;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 700, background: s.bg, color: s.color }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function Ads() {
  const showToast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelling, setCancelling]     = useState(null);

  const STATUS_OPTS = ["", "active", "pending_payment", "expired", "cancelled"];

  function load(status = statusFilter) {
    setLoading(true);
    const qs = status ? `?status=${status}` : "";
    apiFetch(`/api/ads${qs}`)
      .then((d) => { setCampaigns(d.campaigns || []); setTotal(d.total || 0); })
      .catch(() => showToast("Failed to load ad campaigns", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function handleCancel(id) {
    if (!window.confirm("Cancel this campaign? This will remove the product from featured ads.")) return;
    setCancelling(id);
    try {
      await apiFetch(`/api/ads/${id}/cancel`, { method: "PUT" });
      showToast("Campaign cancelled", "success");
      setCampaigns((prev) => prev.map((c) => c._id === id ? { ...c, status: "cancelled" } : c));
    } catch (err) {
      showToast(err?.message || "Failed to cancel", "error");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Ad Campaigns</h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: "1.2rem" }}>{total} total campaign{total !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_OPTS.map((s) => (
            <button
              key={s || "all"}
              onClick={() => { setStatusFilter(s); load(s); }}
              className={statusFilter === s ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            >
              {s ? s.replace("_", " ") : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "2.5rem", color: "var(--accent)" }} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: "1.3rem" }}>
          No campaigns found.
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.25rem" }}>
            <thead>
              <tr style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
                {["Product", "Seller", "Plan", "Amount", "Status", "Starts", "Ends", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                    {c.product?.name || "—"}
                    {c.product?.isAdvertised && (
                      <span style={{ marginLeft: 6, fontSize: "1rem", color: "var(--accent)" }}>⚡</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600 }}>{c.seller?.name || "—"}</div>
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{c.seller?.email}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {AD_PLANS[c.plan]?.label || c.plan}
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{AD_PLANS[c.plan]?.days} days</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>{naira(c.amount)}</td>
                  <td style={{ padding: "12px 14px" }}><StatusPill status={c.status} /></td>
                  <td style={{ padding: "12px 14px", color: "var(--ink-3)" }}>
                    {c.startedAt ? new Date(c.startedAt).toLocaleDateString("en-NG") : "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--ink-3)" }}>
                    {c.endsAt ? new Date(c.endsAt).toLocaleDateString("en-NG") : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {c.status === "active" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCancel(c._id)}
                        disabled={cancelling === c._id}
                        style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                      >
                        {cancelling === c._id ? <i className="fas fa-spinner fa-spin" /> : "Cancel"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
