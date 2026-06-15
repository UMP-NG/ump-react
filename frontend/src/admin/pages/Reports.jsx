import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../utils/api";

const TABS = [
  { label: "Open",      filter: "open" },
  { label: "Reviewed",  filter: "reviewed" },
  { label: "Dismissed", filter: "dismissed" },
  { label: "Removed",   filter: "removed" },
];

const TYPE_COLORS = {
  Product: { bg: "rgba(99,102,241,.1)",  color: "#6366f1" },
  Listing: { bg: "rgba(34,197,94,.1)",   color: "#16a34a" },
  Service: { bg: "rgba(245,158,11,.1)",  color: "#d97706" },
  Seller:  { bg: "rgba(14,165,233,.1)",  color: "#0284c7" },
  User:    { bg: "rgba(239,68,68,.1)",   color: "#dc2626" },
};

const STATUS_STYLES = {
  open:      { bg: "rgba(239,68,68,.1)",  color: "#dc2626" },
  reviewed:  { bg: "rgba(245,158,11,.1)", color: "#d97706" },
  dismissed: { bg: "rgba(107,114,128,.1)",color: "#6b7280" },
  removed:   { bg: "rgba(34,197,94,.1)",  color: "#16a34a" },
};

function ReportDrawer({ report, onClose, onResolved }) {
  const [action, setAction]     = useState("review");
  const [resolution, setRes]    = useState("");
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState("");

  const handleKey = useCallback((e) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  async function resolve() {
    setSub(true); setError("");
    try {
      await apiFetch(`/api/admins/reports/${report._id}/resolve`, {
        method: "POST",
        body: { action, resolution },
      });
      onResolved(report._id, action);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to resolve report");
    } finally {
      setSub(false);
    }
  }

  const ts = TYPE_COLORS[report.refModel] || { bg: "rgba(99,102,241,.1)", color: "#6366f1" };
  const ss = STATUS_STYLES[report.status] || STATUS_STYLES.open;
  const reporter = report.reporter;
  const reporterName = reporter?.name || "Unknown";
  const refName = report.refName || "—";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--paper)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "24px 20px 36px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Report Detail</h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>

        {/* Status + type */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.2rem", fontWeight: 600, background: ts.bg, color: ts.color }}>
            {report.refModel}
          </span>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.2rem", fontWeight: 600, background: ss.bg, color: ss.color }}>
            {report.status}
          </span>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div style={{ padding: 14, background: "var(--surface)", borderRadius: 12 }}>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginBottom: 4 }}>Reported item</div>
            <div style={{ fontWeight: 700, fontSize: "1.35rem" }}>{refName}</div>
          </div>
          <div style={{ padding: 14, background: "var(--surface)", borderRadius: 12 }}>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginBottom: 4 }}>Reporter</div>
            <div style={{ fontWeight: 700, fontSize: "1.35rem" }}>{reporterName}</div>
            {reporter?.email && <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{reporter.email}</div>}
          </div>
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6 }}>Reason</div>
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 10, fontSize: "1.35rem", fontWeight: 600, color: "#dc2626" }}>
            <i className="fas fa-flag" style={{ marginRight: 8 }} />{report.reason}
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 6 }}>Additional details</div>
            <p style={{ margin: 0, fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.6, padding: "10px 14px", background: "var(--surface)", borderRadius: 10 }}>
              {report.description}
            </p>
          </div>
        )}

        {/* Date */}
        <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 20 }}>
          <i className="fas fa-clock" style={{ marginRight: 6 }} />
          Reported {new Date(report.createdAt).toLocaleString()}
        </div>

        {/* Previous resolution */}
        {report.resolution && (
          <div style={{ padding: 14, background: "var(--surface)", borderRadius: 12, marginBottom: 18 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>Previous resolution note</div>
            <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{report.resolution}</p>
          </div>
        )}

        {/* Resolve section */}
        {report.status === "open" && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0 18px" }} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 8 }}>Action</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { v: "review",   label: "Mark Reviewed",  icon: "fa-eye",       color: "#d97706" },
                  { v: "dismiss",  label: "Dismiss",         icon: "fa-ban",       color: "#6b7280" },
                  { v: "remove",   label: "Remove Content",  icon: "fa-trash-can", color: "#dc2626" },
                ].map(({ v, label, icon, color }) => (
                  <label
                    key={v}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${action === v ? color : "var(--line)"}`, background: action === v ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent", cursor: "pointer", fontSize: "1.3rem", fontWeight: 600, color: action === v ? color : "var(--ink-2)", transition: "all .15s" }}
                  >
                    <input type="radio" name="action" value={v} checked={action === v} onChange={() => setAction(v)} style={{ display: "none" }} />
                    <i className={`fas ${icon}`} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                Resolution note <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span>
              </label>
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                placeholder="Note for internal reference…"
                value={resolution}
                onChange={(e) => setRes(e.target.value)}
                style={{ width: "100%", resize: "none" }}
              />
            </div>

            {error && (
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, fontSize: "1.2rem", color: "#ef4444", marginBottom: 14 }}>
                <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />{error}
              </div>
            )}

            <button
              className="btn btn-block"
              onClick={resolve}
              disabled={submitting}
              style={{ background: action === "remove" ? "#dc2626" : action === "dismiss" ? "#6b7280" : "#d97706", color: "#fff", border: "none", borderRadius: "var(--r-pill)", height: 48, fontWeight: 700, fontSize: "1.4rem", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? <i className="fas fa-spinner fa-spin" /> : "Confirm action"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab]         = useState("open");
  const [reports, setReports] = useState([]);
  const [total, setTotal]     = useState(0);
  const [counts, setCounts]   = useState({});
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [typeFilter, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer]   = useState(null);
  const fetchRef = useRef(0);

  useEffect(() => {
    const id = ++fetchRef.current;
    setLoading(true);
    const qs = new URLSearchParams({ status: tab, page, limit: 20 });
    if (typeFilter) qs.set("refModel", typeFilter);
    apiFetch(`/api/admins/reports?${qs}`)
      .then((d) => {
        if (fetchRef.current !== id) return;
        setReports(d.reports || []);
        setTotal(d.total || 0);
        setCounts(d.counts || {});
      })
      .catch(() => {})
      .finally(() => { if (fetchRef.current === id) setLoading(false); });
  }, [tab, page, typeFilter]);

  const displayed = search
    ? reports.filter((r) => {
        const q = search.toLowerCase();
        return (r.refName || "").toLowerCase().includes(q)
          || (r.reporter?.name || "").toLowerCase().includes(q)
          || (r.reason || "").toLowerCase().includes(q);
      })
    : reports;

  function handleResolved(id, action) {
    setReports((prev) => prev.filter((r) => r._id !== id));
    const newStatus = action === "dismiss" ? "dismissed" : action === "remove" ? "removed" : "reviewed"; // backend maps "review"→"reviewed"
    setCounts((prev) => ({
      ...prev,
      [tab]: Math.max(0, (prev[tab] || 0) - 1),
      [newStatus]: (prev[newStatus] || 0) + 1,
    }));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, margin: "0 0 4px" }}>Reported Content</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>Review and act on content reported by users</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Open",      key: "open",      icon: "fa-flag",            color: "#dc2626" },
          { label: "Reviewed",  key: "reviewed",  icon: "fa-eye",             color: "#d97706" },
          { label: "Dismissed", key: "dismissed", icon: "fa-ban",             color: "#6b7280" },
          { label: "Removed",   key: "removed",   icon: "fa-trash-can",       color: "#16a34a" },
        ].map(({ label, key, icon, color }) => (
          <div key={key} style={{ padding: "14px 16px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, cursor: "pointer", outline: tab === key ? `2px solid ${color}` : "none" }} onClick={() => { setTab(key); setPage(1); }}>
            <i className={`fas ${icon}`} style={{ color, fontSize: "1.4rem", marginBottom: 6, display: "block" }} />
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>{counts[key] ?? 0}</div>
            <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <i className="fas fa-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", fontSize: "1.2rem" }} />
          <input
            className="input"
            placeholder="Search by item, reporter, or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>
        <select className="input" value={typeFilter} onChange={(e) => { setType(e.target.value); setPage(1); }} style={{ width: "auto" }}>
          <option value="">All types</option>
          {["Product", "Listing", "Service", "Seller", "User"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {TABS.map(({ label, filter }) => (
          <button
            key={filter}
            onClick={() => { setTab(filter); setPage(1); }}
            style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: "1.25rem", cursor: "pointer", background: tab === filter ? "var(--paper)" : "transparent", color: tab === filter ? "var(--ink-1)" : "var(--ink-3)", boxShadow: tab === filter ? "var(--shadow-sm)" : "none", transition: "all .15s" }}
          >
            {label}
            {counts[filter] > 0 && (
              <span style={{ marginLeft: 6, background: filter === "open" ? "#ef4444" : "var(--surface)", color: filter === "open" ? "#fff" : "var(--ink-2)", borderRadius: 10, padding: "1px 7px", fontSize: "1.1rem" }}>
                {counts[filter]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-3)" }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: "1.8rem" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-3)", fontSize: "1.4rem" }}>
            <i className="fas fa-flag" style={{ display: "block", fontSize: "2.4rem", marginBottom: 10 }} />
            No {tab} reports
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface)", fontSize: "1.15rem", color: "var(--ink-3)", fontWeight: 600 }}>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Type</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Reported item</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Reporter</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Reason</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "10px 16px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "10px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {displayed.map((r, i) => {
                const ts = TYPE_COLORS[r.refModel] || { bg: "rgba(99,102,241,.1)", color: "#6366f1" };
                const ss = STATUS_STYLES[r.status] || STATUS_STYLES.open;
                const refName = r.refName || "—";
                return (
                  <tr
                    key={r._id}
                    className="rpt-row"
                    style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none", cursor: "pointer" }}
                    onClick={() => setDrawer(r)}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.2rem", fontWeight: 600, background: ts.bg, color: ts.color }}>
                        {r.refModel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "1.3rem", fontWeight: 600 }}>{refName}</td>
                    <td style={{ padding: "12px 16px", fontSize: "1.3rem", color: "var(--ink-2)" }}>{r.reporter?.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "1.2rem", color: "var(--ink-2)", maxWidth: 200 }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {r.reason}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "1.2rem", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.15rem", fontWeight: 600, background: ss.bg, color: ss.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setDrawer(r); }}>
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 20 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <i className="fas fa-chevron-left" /> Prev
          </button>
          <span style={{ fontSize: "1.3rem", color: "var(--ink-2)" }}>Page {page} of {Math.ceil(total / 20)}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>
            Next <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}

      {drawer && (
        <ReportDrawer
          report={drawer}
          onClose={() => setDrawer(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}
