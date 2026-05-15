import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import FloatingChat from "../components/FloatingChat";
import Skel from "../components/Skel";

const SERVICE_CATS = ["Design", "Writing", "Tech / Coding", "Tutoring", "Photography", "Fitness", "Music", "Other"];
const PACKAGES     = ["Basic", "Standard", "Premium"];

const NAV = [
  { id: "Home",     icon: "house",      label: "Dashboard Home" },
  { id: "Services", icon: "briefcase",  label: "My Services" },
  { id: "Bookings", icon: "calendar",   label: "All Bookings" },
  { id: "Payouts",  icon: "wallet",     label: "Payouts" },
  { id: "Settings", icon: "gear",       label: "Settings" },
];

const lSty = { fontSize: "1.25rem", fontWeight: 600, color: "var(--ink-2)", marginBottom: 6, display: "block" };
const iSty = { width: "100%", padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--paper)", fontSize: "1.3rem", color: "var(--ink-1)", fontFamily: "var(--font-sans)", boxSizing: "border-box" };

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, navigate, user, service }) {
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const initials = (user?.name || "P").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="seller-sidebar">
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>
          <span style={{ color: "var(--accent)" }}>U</span>MP
        </div>
        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.4)", marginTop: 2 }}>Provider Portal</div>
      </div>

      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: "1.6rem", flexShrink: 0, overflow: "hidden", padding: avatarUrl ? 0 : undefined }}>
          {avatarUrl ? <img src={avatarUrl} alt={user?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Provider"}</div>
          <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.45)" }}>{service?.title || "Service Provider"}</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`seller-nav-item${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <i className={`fas fa-${item.icon}`} style={{ width: 18, textAlign: "center", flexShrink: 0 }} />
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: "12px 0 20px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <button className="seller-nav-item" onClick={() => navigate("/")} style={{ color: "rgba(255,255,255,.5)" }}>
          <i className="fas fa-arrow-left" style={{ width: 18, textAlign: "center" }} />
          Return to UMP
        </button>
      </div>
    </aside>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pending:   { bg: "#fef3c7", color: "#d97706" },
    confirmed: { bg: "#dcfce7", color: "#16a34a" },
    completed: { bg: "#dbeafe", color: "#2563eb" },
    rejected:  { bg: "#fee2e2", color: "#dc2626" },
    cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ fontSize: "1.1rem", padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: s.bg, color: s.color }}>
      {status || "pending"}
    </span>
  );
}

// ─── Add / Edit Service Modal ─────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave, showToast }) {
  const isEdit = !!service;
  const imageRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:       service?.title || "",
    category:    service?.category || "",
    desc:        service?.desc || service?.description || "",
    rate:        service?.rate || service?.ratePerHour || "",
    currency:    service?.currency || "NGN",
    package:     service?.package || "",
    duration:    service?.duration || "",
    timeSlots:   service?.timeSlots || "",
    available:   service?.available ?? true,
    imageUrl:    service?.serviceImageUrl || "",
    imageFile:   null,
  });
  const [preview, setPreview] = useState(service?.serviceImageUrl || null);

  function pickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, imageFile: file }));
  }

  async function handleSave() {
    if (!form.title || !form.rate) { showToast("Title and rate are required", "error"); return; }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (form.imageFile) {
        const fd = new FormData();
        fd.append("file", form.imageFile);
        const up = await apiFetch("/api/upload", { method: "POST", body: fd });
        imageUrl = up.url;
      }
      const body = {
        title: form.title,
        category: form.category,
        desc: form.desc,
        rate: Number(form.rate),
        currency: form.currency,
        package: form.package,
        duration: form.duration,
        timeSlots: form.timeSlots,
        available: form.available,
        ...(imageUrl && { serviceImageUrl: imageUrl }),
      };
      const data = isEdit
        ? await apiFetch(`/api/services/${service._id}`, { method: "PUT", body })
        : await apiFetch("/api/services", { method: "POST", body });
      onSave(data.service || data);
      showToast(isEdit ? "Service updated" : "Service created", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save service", "error");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div className="card" style={{ maxWidth: 520, width: "100%", padding: 24, marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>{isEdit ? "Edit Service" : "Add Service"}</h2>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-xmark" /></button>
        </div>

        {/* Image */}
        <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImage} />
        <div style={{ marginBottom: 16 }}>
          <label style={lSty}>Service Image</label>
          <button type="button" onClick={() => imageRef.current?.click()} style={{ width: "100%", height: 90, borderRadius: "var(--r-md)", border: preview ? "none" : "2px dashed var(--line)", background: preview ? "transparent" : "var(--surface)", overflow: "hidden", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {preview
              ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <><i className="fas fa-camera" style={{ color: "var(--ink-4)", fontSize: "1.6rem" }} /><span style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Upload image (optional)</span></>}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lSty}>Service Title *</label>
            <input style={iSty} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Developer" />
          </div>
          <div>
            <label style={lSty}>Category</label>
            <select style={iSty} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option value="">Select</option>
              {SERVICE_CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lSty}>Package</label>
            <select style={iSty} value={form.package} onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}>
              <option value="">Select</option>
              {PACKAGES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={lSty}>Rate *</label>
            <input style={iSty} type="number" min="0" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="50000" />
          </div>
          <div>
            <label style={lSty}>Currency</label>
            <select style={iSty} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label style={lSty}>Duration</label>
            <input style={iSty} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 2 hours" />
          </div>
          <div>
            <label style={lSty}>Time Slots</label>
            <input style={iSty} value={form.timeSlots} onChange={(e) => setForm((f) => ({ ...f, timeSlots: e.target.value }))} placeholder="e.g. Mon 9am–11am" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lSty}>Description</label>
            <textarea style={{ ...iSty, height: 72, resize: "vertical" }} value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} placeholder="Describe your service..." />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>Currently Available?</div>
            <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>Clients can book you right now</div>
          </div>
          <label className="partner-toggle" style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={form.available} onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked })) } style={{ display: "none" }} />
            <span className={`partner-toggle-track${form.available ? " on" : ""}`} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-block" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-block" disabled={saving} onClick={handleSave}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> {isEdit ? "Update" : "Create"} Service</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProviderAnalytics() {
  const navigate  = useNavigate();
  const { user }  = useUser();
  const showToast = useToast();

  const [tab, setTab]         = useState("Home");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis]       = useState({ totalRevenue: 0, sessionsCompleted: 0, avgRating: 0 });
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [service, setService]   = useState(null);
  const [verifyRequested, setVerifyRequested] = useState(false);
  const [verifyLoading, setVerifyLoading]     = useState(false);

  // Services tab
  const [services, setServices]           = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesFetched, setServicesFetched] = useState(false);
  const [serviceModal, setServiceModal]   = useState(null); // null | "new" | service object
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  const [serviceDeleting, setServiceDeleting] = useState(false);

  // Bookings
  const [bookingActing, setBookingActing] = useState({});
  const [bookingFilter, setBookingFilter] = useState("All");

  // Payouts
  const [payouts, setPayouts]             = useState([]);
  const [bankForm, setBankForm]           = useState({ bankName: "", accountNo: "", accountName: "" });
  const [bankSaving, setBankSaving]       = useState(false);
  const [payoutAmount, setPayoutAmount]   = useState("");
  const [payoutSaving, setPayoutSaving]   = useState(false);

  // Settings
  const [settingsForm, setSettingsForm]   = useState({ title: "", desc: "", timeSlots: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiFetch("/api/service-analytics/kpi").catch(() => ({})),
      apiFetch("/api/service-analytics/sessions/recent").catch(() => []),
      apiFetch("/api/bookings/provider").catch(() => []),
      apiFetch("/api/payouts").catch(() => []),
      apiFetch("/api/payouts/details").catch(() => null),
      apiFetch("/api/services/mine").catch(() => null),
    ]).then(([kpisData, sessData, bkgs, pays, bankDets, myServices]) => {
      setKpis(kpisData || {});
      setSessions(Array.isArray(sessData) ? sessData : sessData?.sessions || []);
      setBookings(bkgs.bookings || (Array.isArray(bkgs) ? bkgs : []));
      setPayouts(pays.payouts || (Array.isArray(pays) ? pays : []));
      if (bankDets?.accountDetails) setBankForm((f) => ({ ...f, ...bankDets.accountDetails }));
      const svc = Array.isArray(myServices)
        ? myServices[0]
        : myServices?.services?.[0] ?? null;
      if (svc) {
        setService(svc);
        setVerifyRequested(!!(svc.verificationRequested));
        setSettingsForm({
          title:     svc.title || "",
          desc:      svc.description || svc.desc || "",
          timeSlots: svc.timeSlots || "",
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Load services when Services tab opens ─────────────────────────────────────
  useEffect(() => {
    if (tab !== "Services" || servicesFetched) return;
    setServicesFetched(true);
    setServicesLoading(true);
    apiFetch("/api/services/mine")
      .then((d) => setServices(Array.isArray(d) ? d : d?.services || []))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, [tab, servicesFetched]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const isVerified      = !!(service?.verified);

  const filteredBookings = bookingFilter === "All"
    ? bookings
    : bookings.filter((b) => b.status === bookingFilter.toLowerCase());

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function requestVerification() {
    setVerifyLoading(true);
    try {
      await apiFetch("/api/services/request-verification", { method: "POST" });
      setVerifyRequested(true);
      showToast("Verification request sent", "success");
    } catch (err) { showToast(err?.message || "Failed", "error"); }
    finally { setVerifyLoading(false); }
  }

  async function handleAccept(id) {
    setBookingActing((s) => ({ ...s, [id]: "accept" }));
    try {
      await apiFetch(`/api/bookings/${id}/accept`, { method: "PUT" });
      setBookings((prev) => prev.map((b) => b._id === id ? { ...b, status: "confirmed" } : b));
      showToast("Booking accepted", "success");
    } catch (err) { showToast(err?.message || "Failed to accept", "error"); }
    finally { setBookingActing((s) => { const n = { ...s }; delete n[id]; return n; }); }
  }

  async function handleReject(id) {
    setBookingActing((s) => ({ ...s, [id]: "reject" }));
    try {
      await apiFetch(`/api/bookings/${id}/reject`, { method: "PUT" });
      setBookings((prev) => prev.map((b) => b._id === id ? { ...b, status: "rejected" } : b));
      showToast("Booking rejected", "success");
    } catch (err) { showToast(err?.message || "Failed to reject", "error"); }
    finally { setBookingActing((s) => { const n = { ...s }; delete n[id]; return n; }); }
  }

  async function handleDeleteService(id) {
    setServiceDeleting(true);
    try {
      await apiFetch(`/api/services/${id}`, { method: "DELETE" });
      setServices((s) => s.filter((x) => x._id !== id));
      showToast("Service deleted", "success");
    } catch (err) { showToast(err?.message || "Failed to delete", "error"); }
    finally { setServiceDeleting(false); setDeleteServiceId(null); }
  }

  function handleServiceSaved(saved) {
    if (serviceModal === "new") {
      setServices((s) => [saved, ...s]);
    } else {
      setServices((s) => s.map((x) => x._id === saved._id ? { ...x, ...saved } : x));
    }
    setServiceModal(null);
  }

  async function saveBankDetails() {
    if (!bankForm.bankName || !bankForm.accountNo || !bankForm.accountName) { showToast("All bank fields required", "error"); return; }
    setBankSaving(true);
    try {
      await apiFetch("/api/payouts/details", { method: "PUT", body: { accountDetails: bankForm } });
      showToast("Bank details saved", "success");
    } catch (err) { showToast(err?.message || "Failed", "error"); }
    finally { setBankSaving(false); }
  }

  async function requestPayout() {
    const amount = Number(payoutAmount);
    if (!amount || amount < 100) { showToast("Minimum payout is ₦100", "error"); return; }
    setPayoutSaving(true);
    try {
      await apiFetch("/api/payouts/request", { method: "POST", body: { amount, accountDetails: bankForm } });
      showToast("Payout request submitted", "success");
      setPayoutAmount("");
    } catch (err) { showToast(err?.message || "Failed to request payout", "error"); }
    finally { setPayoutSaving(false); }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await apiFetch(`/api/services/${service?._id}`, { method: "PUT", body: { title: settingsForm.title, desc: settingsForm.desc, timeSlots: settingsForm.timeSlots } });
      setService((s) => ({ ...s, ...settingsForm }));
      showToast("Settings saved", "success");
    } catch (err) { showToast(err?.message || "Failed", "error"); }
    finally { setSettingsSaving(false); }
  }

  // ── Booking card ──────────────────────────────────────────────────────────────
  function BookingCard({ b, showActions }) {
    const acting = bookingActing[b._id];
    return (
      <div className="card" style={{ padding: 18, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem" }}>{b.client?.name || b.user?.name || "Client"}</div>
            <StatusPill status={b.status} />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)" }}>{naira(b.amount || b.price || 0)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: "1.25rem", color: "var(--ink-2)", marginBottom: showActions && b.status === "pending" ? 14 : 0 }}>
          {b.date && <div><i className="fas fa-calendar" style={{ marginRight: 6, color: "var(--accent)" }} />Date: {new Date(b.date).toLocaleDateString()}</div>}
          {b.timeSlot && <div><i className="fas fa-clock" style={{ marginRight: 6, color: "var(--accent)" }} />Time: {b.timeSlot}</div>}
          {(b.service?.title || b.serviceTitle) && <div><i className="fas fa-briefcase" style={{ marginRight: 6, color: "var(--accent)" }} />Service: {b.service?.title || b.serviceTitle}</div>}
          {b.notes && <div style={{ gridColumn: "1 / -1", fontStyle: "italic", color: "var(--ink-3)" }}>"{b.notes}"</div>}
        </div>
        {showActions && b.status === "pending" && (
          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            <button className="btn btn-sm" style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none" }} disabled={!!acting} onClick={() => handleAccept(b._id)}>
              {acting === "accept" ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Accept</>}
            </button>
            <button className="btn btn-sm" style={{ flex: 1, color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }} disabled={!!acting} onClick={() => handleReject(b._id)}>
              {acting === "reject" ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-xmark" /> Reject</>}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Page content ──────────────────────────────────────────────────────────────
  const PAGE = (
    <div style={{ padding: "24px 20px", paddingBottom: 80 }}>

      {/* Verification banner */}
      {!loading && !isVerified && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: "var(--r-lg)", background: verifyRequested ? "rgba(59,130,246,.08)" : "rgba(249,115,22,.07)", border: `1px solid ${verifyRequested ? "rgba(59,130,246,.25)" : "rgba(249,115,22,.25)"}`, display: "flex", alignItems: "center", gap: 14 }}>
          <i className={`fas fa-${verifyRequested ? "clock" : "shield-halved"}`} style={{ fontSize: "1.8rem", color: verifyRequested ? "#3b82f6" : "var(--accent)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: verifyRequested ? "#1d4ed8" : "var(--ink-1)" }}>
              {verifyRequested ? "Verification pending" : "Get your service verified"}
            </div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>
              {verifyRequested ? "We're reviewing your profile. You'll be notified once approved." : "A verified badge builds client trust and gets you more bookings."}
            </div>
          </div>
          {!verifyRequested && (
            <button className="btn btn-primary btn-sm" style={{ borderRadius: "var(--r-pill)", flexShrink: 0 }} onClick={requestVerification} disabled={verifyLoading}>
              {verifyLoading ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-badge-check" /> Get Verified</>}
            </button>
          )}
        </div>
      )}

      {/* ── Home tab ── */}
      {tab === "Home" && (
        <div>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
            {/* Total Revenue */}
            <div className="kpi-card">
              <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 6 }}>Total Revenue (Last 30 Days)</div>
              <div style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink-1)" }}>{naira(kpis.totalRevenue || 0)}</div>
            </div>
            {/* Sessions Completed */}
            <div className="kpi-card">
              <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 6 }}>Sessions Completed</div>
              <div style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink-1)" }}>{kpis.sessionsCompleted || 0}</div>
              {(kpis.sessionsCompleted || 0) > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: "1.15rem", color: "#16a34a", fontWeight: 600 }}>
                  <i className="fas fa-arrow-trend-up" /> Consistent activity
                </div>
              )}
            </div>
            {/* Average Rating */}
            <div className="kpi-card">
              <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginBottom: 6 }}>Average Rating</div>
              <div style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--ink-1)" }}>{kpis.avgRating || 0} <span style={{ fontSize: "1.8rem", color: "#f59e0b" }}>★</span></div>
              <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 6 }}>Based on recent sessions</div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Recent Sessions</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setTab("Bookings")}>View all</button>
            </div>
            {sessions.length === 0
              ? <p style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 0", margin: 0 }}>No recent sessions</p>
              : <div style={{ overflowX: "auto" }}>
                  <table className="dash-table">
                    <thead><tr><th>Session Date</th><th>Client</th><th>Service Type</th><th>Earnings</th></tr></thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s._id}>
                          <td style={{ fontSize: "1.25rem" }}>{s.date ? new Date(s.date).toLocaleDateString() : "—"}</td>
                          <td style={{ fontWeight: 600 }}>{s.client?.name || s.clientName || "—"}</td>
                          <td style={{ color: "var(--ink-2)" }}>{s.serviceType || s.service?.title || "—"}</td>
                          <td style={{ fontWeight: 700, color: "var(--accent)" }}>{naira(s.price || s.earnings || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
          </div>

          {/* Pending Booking Requests */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <i className="fas fa-calendar-days" style={{ color: "var(--accent)", fontSize: "1.6rem" }} />
              <h3 style={{ margin: 0, fontSize: "1.7rem", fontWeight: 800 }}>Pending Booking Requests</h3>
              {pendingBookings.length > 0 && (
                <span style={{ background: "var(--accent)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800, flexShrink: 0 }}>
                  {pendingBookings.length}
                </span>
              )}
            </div>
            {pendingBookings.length === 0
              ? <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-3)", fontSize: "1.35rem" }}>
                  <i className="fas fa-calendar-check" style={{ fontSize: "2.4rem", marginBottom: 8, display: "block", color: "var(--ink-4)" }} />
                  No pending requests
                </div>
              : pendingBookings.map((b) => <BookingCard key={b._id} b={b} showActions />)}
          </div>
        </div>
      )}

      {/* ── Services tab ── */}
      {tab === "Services" && (
        <div>
          {serviceModal !== null && (
            <ServiceModal
              service={serviceModal === "new" ? null : serviceModal}
              onClose={() => setServiceModal(null)}
              onSave={handleServiceSaved}
              showToast={showToast}
            />
          )}

          {deleteServiceId && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 360, width: "100%", padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <i className="fas fa-trash" style={{ color: "#dc2626", fontSize: "1.8rem" }} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.7rem", fontWeight: 800 }}>Delete this service?</h3>
                <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: "1.3rem" }}>This action cannot be undone.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => setDeleteServiceId(null)}>Cancel</button>
                  <button className="btn btn-block" style={{ background: "#dc2626", color: "#fff", border: "none" }} disabled={serviceDeleting} onClick={() => handleDeleteService(deleteServiceId)}>
                    {serviceDeleting ? <i className="fas fa-spinner fa-spin" /> : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>My Services</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setServiceModal("new")}><i className="fas fa-plus" /> Add Service</button>
          </div>

          {servicesLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map((i) => <Skel.ServiceCard key={i} />)}
            </div>
          ) : services.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <i className="fas fa-briefcase" style={{ fontSize: "3.2rem", color: "var(--ink-4)", marginBottom: 16 }} />
              <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", marginBottom: 12 }}>No services yet.</p>
              <button className="btn btn-primary" onClick={() => setServiceModal("new")}><i className="fas fa-plus" /> Add your first service</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {services.map((s) => (
                <div key={s._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {s.serviceImageUrl && (
                    <div style={{ height: 120, overflow: "hidden" }}>
                      <img src={s.serviceImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.5rem" }}>{s.title}</div>
                        <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>{s.category || ""}</div>
                      </div>
                      <span style={{ fontSize: "1.1rem", padding: "3px 8px", borderRadius: 20, background: s.available ? "#dcfce7" : "#fee2e2", color: s.available ? "#16a34a" : "#dc2626", fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                        {s.available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                      {s.desc || s.description || ""}
                    </p>
                    <div style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--accent)", marginBottom: 12 }}>
                      {naira(s.rate || s.ratePerHour || 0)} <span style={{ fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-3)" }}>{s.currency || "NGN"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => setServiceModal(s)}>
                        <i className="fas fa-pen" /> Edit
                      </button>
                      <button className="btn btn-sm" style={{ flex: 1, color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }} onClick={() => setDeleteServiceId(s._id)}>
                        <i className="fas fa-trash" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bookings tab ── */}
      {tab === "Bookings" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>All Bookings</h2>
            <select style={{ ...iSty, width: 140 }} value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}>
              {["All", "Pending", "Confirmed", "Completed", "Rejected"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {filteredBookings.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 0" }}>
                <i className="fas fa-calendar" style={{ fontSize: "3rem", color: "var(--ink-4)", marginBottom: 12 }} />
                <p style={{ color: "var(--ink-2)", fontSize: "1.4rem" }}>No {bookingFilter !== "All" ? bookingFilter.toLowerCase() + " " : ""}bookings</p>
              </div>
            : filteredBookings.map((b) => <BookingCard key={b._id} b={b} showActions />)}
        </div>
      )}

      {/* ── Payouts tab ── */}
      {tab === "Payouts" && (
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 20px" }}>Payouts</h2>

          {/* Payout Summary card */}
          <div style={{ background: "linear-gradient(135deg, var(--navy-800), #1e1b4b)", color: "#fff", borderRadius: "var(--r-xl)", padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: "1.25rem", opacity: 0.6, marginBottom: 4 }}>Available for Payout</div>
            <div style={{ fontSize: "3.6rem", fontWeight: 900, letterSpacing: "-0.04em" }}>{naira(kpis.availableBalance || 0)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.15)" }}>
              <div>
                <div style={{ fontSize: "1.1rem", opacity: 0.5 }}>Next Scheduled Payout</div>
                <div style={{ fontSize: "1.35rem", fontWeight: 600, marginTop: 2 }}>{kpis.nextPayout || "Not scheduled"}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
            {/* Bank account */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-university" style={{ marginRight: 8, color: "var(--accent)" }} />Bank Account</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Bank Name</label>
                <input style={iSty} value={bankForm.bankName} onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="e.g. GTBank" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Account Number</label>
                <input style={iSty} value={bankForm.accountNo} onChange={(e) => setBankForm((f) => ({ ...f, accountNo: e.target.value }))} placeholder="10-digit account number" maxLength={10} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Account Name</label>
                <input style={iSty} value={bankForm.accountName} onChange={(e) => setBankForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="Full account name" />
              </div>
              <button className="btn btn-primary btn-sm" disabled={bankSaving} onClick={saveBankDetails} style={{ width: "100%" }}>
                {bankSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Update Payout Details</>}
              </button>
            </div>

            {/* Request payout */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-paper-plane" style={{ marginRight: 8, color: "var(--accent)" }} />Request Early Payout</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Amount (₦)</label>
                <input style={iSty} type="number" min="100" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Enter amount (min ₦100)" />
              </div>
              <div style={{ padding: 12, borderRadius: "var(--r-md)", background: "var(--surface)", marginBottom: 16, fontSize: "1.2rem", color: "var(--ink-3)" }}>
                <div><strong style={{ color: "var(--ink-1)" }}>To:</strong> {bankForm.accountName || "—"}</div>
                <div><strong style={{ color: "var(--ink-1)" }}>Bank:</strong> {bankForm.bankName || "—"} {bankForm.accountNo ? `· ${bankForm.accountNo}` : ""}</div>
              </div>
              <button className="btn btn-primary btn-sm" disabled={payoutSaving || !bankForm.bankName} onClick={requestPayout} style={{ width: "100%" }}>
                {payoutSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-paper-plane" /> Request Early Payout</>}
              </button>
              {!bankForm.bankName && <p style={{ margin: "8px 0 0", fontSize: "1.15rem", color: "var(--ink-3)", textAlign: "center" }}>Save bank details first</p>}
            </div>
          </div>

          {/* Payout history */}
          {payouts.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)" }}>
                <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Payout History</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="dash-table">
                  <thead><tr><th>Amount</th><th>Bank</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p._id || p.id}>
                        <td style={{ fontWeight: 800 }}>{naira(p.amount)}</td>
                        <td style={{ color: "var(--ink-2)" }}>{p.accountDetails?.bankName || p.bank || "Bank transfer"}</td>
                        <td style={{ color: "var(--ink-3)" }}>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td><StatusPill status={p.status || "pending"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "Settings" && (
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 20px" }}>Settings</h2>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-briefcase" style={{ marginRight: 8, color: "var(--accent)" }} />Service Settings</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={lSty}>Service Title</label>
              <input style={iSty} value={settingsForm.title} onChange={(e) => setSettingsForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Developer" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lSty}>Description</label>
              <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={settingsForm.desc} onChange={(e) => setSettingsForm((f) => ({ ...f, desc: e.target.value }))} placeholder="Describe your service..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lSty}>Availability Time Slots</label>
              <input style={iSty} value={settingsForm.timeSlots} onChange={(e) => setSettingsForm((f) => ({ ...f, timeSlots: e.target.value }))} placeholder="e.g. Mon 9am–11am, Wed 2pm–4pm" />
            </div>
            <button className="btn btn-primary btn-sm" disabled={settingsSaving || !service?._id} onClick={saveSettings}>
              {settingsSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Settings</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const MOB_TABS = [
    { id: "Home",     icon: "house" },
    { id: "Services", icon: "briefcase" },
    { id: "Bookings", icon: "calendar" },
    { id: "Payouts",  icon: "wallet" },
    { id: "Settings", icon: "gear" },
  ];

  return (
    <>
      <FloatingChat />
      <div className="seller-dash">
        <Sidebar tab={tab} setTab={setTab} navigate={navigate} user={user} service={service} />

        <main className="seller-main">
          <div className="seller-mobile-header" style={{ padding: "14px 16px", background: "var(--navy-800)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span style={{ color: "var(--accent)" }}>U</span>MP <span style={{ fontSize: "1.4rem", fontWeight: 600, opacity: 0.6 }}>Provider</span>
            </div>
            <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none" }} onClick={() => navigate("/")}>
              <i className="fas fa-arrow-left" /> UMP
            </button>
          </div>

          {loading
            ? (
              <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ flex: "1 1 160px", borderRadius: 16, padding: 16, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <Skel w={36} h={36} r={10} />
                      <Skel w="55%" h={20} r={6} />
                      <Skel w="75%" h={12} r={4} />
                    </div>
                  ))}
                </div>
                {[1,2,3].map(i => <Skel.ServiceCard key={i} />)}
              </div>
            )
            : PAGE}

          <div className="seller-mob-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--navy-800)", display: "flex", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 55 }}>
            {MOB_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: "10px 4px", border: "none", background: "transparent", color: tab === t.id ? "var(--accent)" : "rgba(255,255,255,.5)", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "var(--font-sans)" }}
              >
                <i className={`fas fa-${t.icon}`} style={{ fontSize: "1.6rem" }} />
                {t.id}
              </button>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
