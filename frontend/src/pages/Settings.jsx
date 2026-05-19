import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../utils/api";

const TABS = ["Profile", "Security", "Notifications"];

// ─── Avatar ──────────────────────────────────────────────────────────────────
function AvatarPicker({ avatarUrl, initials, onPick, uploading }) {
  const ref = useRef();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
      <div
        className="avatar"
        style={{ width: 72, height: 72, fontSize: "2.4rem", overflow: "hidden", padding: avatarUrl ? 0 : undefined, flexShrink: 0, cursor: "pointer", position: "relative" }}
        onClick={() => ref.current.click()}
      >
        {uploading
          ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "rgba(0,0,0,.35)", position: "absolute", inset: 0, borderRadius: "inherit" }}>
              <i className="fas fa-spinner fa-spin" style={{ color: "#fff", fontSize: "1.8rem" }} />
            </div>
          : null}
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>
      <div>
        <button className="btn btn-sm btn-ghost" onClick={() => ref.current.click()} disabled={uploading}>
          <i className="fas fa-camera" /> Change photo
        </button>
        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>JPG or PNG, max 5 MB</div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="partner-toggle" style={{ cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
      <span className={`partner-toggle-track${checked ? " on" : ""}`} />
    </label>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab({ user, setUser, showToast }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const initials = (user?.name || user?.email || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  async function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiFetch("/api/upload", { method: "POST", body: fd });
      const avatar = { url: data.url, publicId: data.publicId || "" };
      await apiFetch("/api/users/me", { method: "PUT", body: { avatar } });
      setUser((u) => ({ ...u, avatar }));
      showToast("Profile photo updated", "success");
    } catch (err) {
      showToast(err?.message || "Photo upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiFetch("/api/users/me", { method: "PUT", body: form });
      setUser((u) => ({ ...u, ...data.user }));
      showToast("Profile saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <AvatarPicker avatarUrl={avatarUrl} initials={initials} onPick={handleAvatarPick} uploading={uploading} />

      <div className="label">Full name</div>
      <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
      <div style={{ height: 12 }} />

      <div className="label">Email</div>
      <input className="input" value={user?.email || ""} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>School email cannot be changed</div>
      <div style={{ height: 12 }} />

      <div className="label">Phone number</div>
      <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 xxx xxxx xxx" type="tel" />
      <div style={{ height: 12 }} />

      <div className="label">Delivery address</div>
      <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Hall / hostel / room" />
      <div style={{ height: 12 }} />

      <div className="label">Bio</div>
      <textarea className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell buyers a bit about yourself…" rows={3} />
      <div style={{ height: 20 }} />

      <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
        {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : "Save changes"}
      </button>
    </form>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
const STRENGTH_RULES = [
  { key: "len",     label: "At least 6 characters",       test: (p) => p.length >= 6 },
  { key: "upper",   label: "One uppercase letter (A–Z)",  test: (p) => /[A-Z]/.test(p) },
  { key: "lower",   label: "One lowercase letter (a–z)",  test: (p) => /[a-z]/.test(p) },
  { key: "number",  label: "One number (0–9)",             test: (p) => /\d/.test(p) },
  { key: "special", label: "One special character (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function strengthScore(p) { return STRENGTH_RULES.filter((r) => r.test(p)).length; }

const STRENGTH_LABEL = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
const STRENGTH_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function StrengthMeter({ password }) {
  if (!password) return null;
  const score = strengthScore(password);
  return (
    <div style={{ marginTop: -4, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {STRENGTH_RULES.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? STRENGTH_COLOR[score] : "var(--line)", transition: "background .2s" }} />
        ))}
      </div>
      <div style={{ fontSize: "1.15rem", color: STRENGTH_COLOR[score], fontWeight: 600, marginBottom: 8 }}>
        {STRENGTH_LABEL[score]}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STRENGTH_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: ok ? "#16a34a" : "var(--ink-3)" }}>
              <i className={`fas fa-${ok ? "circle-check" : "circle"}`} style={{ fontSize: "1.1rem", flexShrink: 0 }} />
              {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Password field — must live outside SecurityTab so React doesn't treat it
// as a new component type on every keystroke (which would unmount the input
// and dismiss the mobile keyboard on each render).
function PasswordField({ label, value, onChange, visible, onToggle, children }) {
  return (
    <>
      <div className="label">{label}</div>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 44 }}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: "1.4rem" }}
        >
          <i className={`fas fa-eye${visible ? "-slash" : ""}`} />
        </button>
      </div>
      <div style={{ height: 12 }} />
      {children}
    </>
  );
}

// ─── Security tab ─────────────────────────────────────────────────────────────
function SecurityTab({ showToast, onAccountDeleted }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [deleting, setDeleting] = useState(false);

  const allRulesMet = STRENGTH_RULES.every((r) => r.test(form.newPassword));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allRulesMet)
      return showToast("Password doesn't meet all requirements", "error");
    if (form.newPassword !== form.confirm)
      return showToast("New passwords don't match", "error");
    setSaving(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      showToast("Password changed successfully", "success");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      showToast(err?.message || "Failed to change password", "error");
    } finally {
      setSaving(false);
    }
  }

  const confirmMatch = form.confirm && form.newPassword === form.confirm;
  const confirmMismatch = form.confirm && form.newPassword !== form.confirm;

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }}>Change password</h3>
        <PasswordField label="Current password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} visible={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} />
        <PasswordField label="New password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} visible={show.new} onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}>
          <StrengthMeter password={form.newPassword} />
        </PasswordField>
        <PasswordField label="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} visible={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} />
        {confirmMismatch && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "#ef4444", marginTop: -6, marginBottom: 12 }}>
            <i className="fas fa-circle-xmark" /> Passwords don't match
          </div>
        )}
        {confirmMatch && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "#16a34a", marginTop: -6, marginBottom: 12 }}>
            <i className="fas fa-circle-check" /> Passwords match
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={saving || !allRulesMet || confirmMismatch}>
          {saving ? <><i className="fas fa-spinner fa-spin" /> Updating…</> : "Update password"}
        </button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>Account</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>Permanently delete your UMP account</div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--danger, #dc2626)", border: "1px solid var(--danger, #dc2626)", background: "transparent", flexShrink: 0 }}
            disabled={deleting}
            onClick={async () => {
              const confirmed = window.confirm("Are you sure? This will permanently delete your account and all your data. This cannot be undone.");
              if (!confirmed) return;
              const reconfirmed = window.confirm("Last warning: your orders, listings, and messages will be permanently removed. Proceed?");
              if (!reconfirmed) return;
              setDeleting(true);
              try {
                await apiFetch("/api/users/me", { method: "DELETE" });
                showToast("Account deleted. Goodbye!", "success");
                onAccountDeleted();
              } catch (err) {
                showToast(err?.message || "Failed to delete account", "error");
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? <i className="fas fa-spinner fa-spin" /> : "Delete account"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab({ user, setUser, showToast }) {
  const prefs = user?.notificationPreferences || { order: true, message: true, payout: true, inventory: true };
  const [saving, setSaving] = useState(false);

  async function handleToggle(key, val) {
    const next = { ...prefs, [key]: val };
    setUser((u) => ({ ...u, notificationPreferences: next }));
    setSaving(true);
    try {
      await apiFetch("/api/users/me", { method: "PUT", body: { notificationPreferences: next } });
      showToast("Preferences saved", "success");
    } catch {
      setUser((u) => ({ ...u, notificationPreferences: prefs }));
      showToast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  const ROWS = [
    { key: "order",     icon: "box",           label: "Order updates",       desc: "Shipping, delivery and status changes" },
    { key: "message",   icon: "message",        label: "New messages",        desc: "When someone sends you a message" },
    { key: "payout",    icon: "wallet",         label: "Payouts & payments",  desc: "When you receive a payment or payout" },
    { key: "inventory", icon: "triangle-exclamation", label: "Low inventory", desc: "When your product stock runs low" },
  ];

  return (
    <div className="card" style={{ padding: "4px 0" }}>
      {ROWS.map((row, i) => (
        <div key={row.key} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: i < ROWS.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`fas fa-${row.icon}`} style={{ fontSize: "1.5rem", color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{row.label}</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>{row.desc}</div>
          </div>
          <Toggle checked={!!prefs[row.key]} onChange={(v) => handleToggle(row.key, v)} disabled={saving} />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const showToast = useToast();
  const [tab, setTab] = useState("Profile");

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Settings</h1>
      </div>

      {/* tabs */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ padding: "10px 14px", border: "none", background: "transparent", fontSize: "1.4rem", fontWeight: 600, color: tab === t ? "var(--accent)" : "var(--ink-3)", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px 80px" }}>
        {tab === "Profile"       && <ProfileTab       user={user} setUser={setUser} showToast={showToast} />}
        {tab === "Security"      && <SecurityTab      showToast={showToast} onAccountDeleted={() => { setUser(null); navigate("/login"); }} />}
        {tab === "Notifications" && <NotificationsTab user={user} setUser={setUser} showToast={showToast} />}
      </div>

      <BottomNav />
    </div>
  );
}
