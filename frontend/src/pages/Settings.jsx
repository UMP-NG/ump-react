import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../utils/api";
import { isPushSupported, requestPushPermission, disablePushNotifications } from "../utils/pushNotification";
import ImageCropModal from "../components/ImageCropModal";

const DOMAIN = "@live.unilag.edu.ng";
const BASE_TABS = ["Profile", "Security", "Notifications"];

// ─── Avatar ──────────────────────────────────────────────────────────────────
function AvatarPicker({ avatarUrl, initials, onPick, uploading }) {
  const ref = useRef();
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => { setAvatarBroken(false); }, [avatarUrl]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
      <div
        className="avatar"
        style={{ width: 72, height: 72, fontSize: "2.4rem", overflow: "hidden", padding: avatarUrl && !avatarBroken ? 0 : undefined, flexShrink: 0, cursor: "pointer", position: "relative" }}
        onClick={() => ref.current.click()}
      >
        {uploading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "rgba(0,0,0,.35)", position: "absolute", inset: 0, borderRadius: "inherit" }}>
            <i className="fas fa-spinner fa-spin" style={{ color: "#fff", fontSize: "1.8rem" }} />
          </div>
        )}
        {avatarUrl && !avatarBroken
          ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarBroken(true)} />
          : initials}
      </div>
      <div>
        <button className="btn btn-sm btn-ghost" onClick={() => ref.current.click()} disabled={uploading}>
          <i className="fas fa-camera" /> Change photo
        </button>
        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>JPG or PNG · Max 5 MB</div>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="partner-toggle" style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} onChange={(e) => !disabled && onChange(e.target.checked)} style={{ display: "none" }} />
      <span className={`partner-toggle-track${checked ? " on" : ""}`} />
    </label>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return (
    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", margin: "24px 0 10px" }}>
      {title}
    </div>
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
  const [cropSrc, setCropSrc] = useState(null);
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const initials = (user?.name || user?.email || "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const isGoogleEmail = user?.googleAccount && !user?.schoolEmail;

  function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(blob) {
    setCropSrc(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
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
    <>
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        aspect={1}
        title="Crop profile photo"
        onConfirm={handleCropConfirm}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <form onSubmit={handleSave}>
      <SectionLabel title="Profile photo" />
      <AvatarPicker avatarUrl={avatarUrl} initials={initials} onPick={handleAvatarPick} uploading={uploading} />

      <SectionLabel title="Personal information" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Full name</div>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aisha Ogundimu" />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Email address</div>
          <input className="input" value={user?.email || ""} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>
            {isGoogleEmail ? "Signed in with Google — link your school email in the Verify tab to change." : "School email addresses cannot be changed."}
          </div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Phone number</div>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 xxx xxxx xxx" type="tel" />
        </div>
      </div>

      <SectionLabel title="Delivery information" />
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Delivery address</div>
        <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Hall / hostel / room" />
        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>Used for campus deliveries and order coordination.</div>
      </div>

      <SectionLabel title="About you" />
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Bio</div>
        <textarea className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell buyers a bit about yourself and what you offer…" rows={3} />
      </div>

      <div style={{ height: 20 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
          {saving ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : "Save changes"}
        </button>
      </div>
    </form>
    </>
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
function SecurityTab({ user, showToast, onAccountDeleted }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const allRulesMet = STRENGTH_RULES.every((r) => r.test(form.newPassword));
  const confirmMatch = form.confirm && form.newPassword === form.confirm;
  const confirmMismatch = form.confirm && form.newPassword !== form.confirm;

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (!allRulesMet) return showToast("Password doesn't meet all requirements", "error");
    if (form.newPassword !== form.confirm) return showToast("New passwords don't match", "error");
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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiFetch("/api/users/me", { method: "DELETE" });
      showToast("Account deleted. Goodbye!", "success");
      onAccountDeleted();
    } catch (err) {
      showToast(err?.message || "Failed to delete account", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const isGoogleAccount = user?.googleAccount;

  return (
    <div>
      {/* Password section */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Password</div>
          <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginTop: 2 }}>Change your account password to keep it secure.</div>
        </div>
        {isGoogleAccount ? (
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: "var(--r-md)", fontSize: "1.3rem", color: "var(--ink-2)" }}>
            <i className="fab fa-google" style={{ marginRight: 8, color: "#4285f4" }} />
            You signed in with Google. Password login is not available for this account.
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit}>
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
            <button className="btn btn-primary btn-block" type="submit" disabled={saving || !allRulesMet || !!confirmMismatch}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Updating…</> : "Update password"}
            </button>
          </form>
        )}
      </div>

      {/* Connected accounts */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Connected accounts</div>
          <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginTop: 2 }}>Manage linked sign-in methods.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isGoogleAccount ? "#e8f0fe" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fab fa-google" style={{ fontSize: "1.8rem", color: isGoogleAccount ? "#4285f4" : "var(--ink-3)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "1.4rem" }}>Google</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 1 }}>
              {isGoogleAccount ? `Connected · ${user?.email}` : "Not connected"}
            </div>
          </div>
          {isGoogleAccount && (
            <div style={{ padding: "4px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: "var(--r-pill)", fontSize: "1.15rem", fontWeight: 600 }}>
              Active
            </div>
          )}
        </div>
      </div>

      {/* Two-Factor Authentication placeholder */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Two-factor authentication</div>
            <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginTop: 2 }}>Add an extra layer of security to your account.</div>
          </div>
          <div style={{ padding: "4px 12px", background: "var(--surface)", borderRadius: "var(--r-pill)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink-3)", flexShrink: 0 }}>
            Coming soon
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: 16, border: "1px solid #fecaca" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626" }}>Danger zone</div>
          <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginTop: 2 }}>Sensitive and irreversible account actions.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>Delete account</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>Permanently delete your UMP account and all your data.</div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "#dc2626", border: "1px solid #dc2626", background: "transparent", flexShrink: 0 }}
            onClick={() => setShowDeleteModal(true)}
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <>
          <div onClick={() => setShowDeleteModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(90vw, 420px)", background: "var(--card)", borderRadius: "var(--r-xl)", padding: 24, zIndex: 201, boxShadow: "var(--shadow-deep)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="fas fa-triangle-exclamation" style={{ color: "#dc2626", fontSize: "1.8rem" }} />
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.8rem", textAlign: "center", marginBottom: 8 }}>Delete account?</div>
            <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", textAlign: "center", lineHeight: 1.6, margin: "0 0 24px" }}>
              This will permanently delete your orders, listings, messages, and all other data. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", fontSize: "1.3rem", padding: "10px 0", borderRadius: "var(--r-md)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                disabled={deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? <i className="fas fa-spinner fa-spin" /> : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────
const NOTIF_ROWS = [
  { key: "order",      icon: "box",            label: "Order updates",       desc: "Shipping, delivery and status changes" },
  { key: "message",    icon: "message",         label: "New messages",        desc: "When someone sends you a message" },
  { key: "payout",     icon: "wallet",          label: "Payouts & payments",  desc: "When you receive a payment or payout" },
  { key: "account",    icon: "shield-halved",   label: "Account & activity",  desc: "Important account updates and activity notifications" },
  { key: "platform",   icon: "bullhorn",        label: "Platform updates",    desc: "New features, announcements and important changes" },
  { key: "promotions", icon: "tag",             label: "Promotions & offers", desc: "Discounts, campaigns and special offers" },
];

function NotificationsTab({ user, setUser, showToast }) {
  const navigate = useNavigate();
  const prefs = user?.notificationPreferences || {};
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(!!(user?.fcmToken));
  const [pushLoading, setPushLoading] = useState(false);
  const pushAvailable = isPushSupported();

  // Consent is persisted per user so they don't have to re-accept on every visit
  const storageKey = `notif_consent_${user?._id || "guest"}`;
  const [termsAccepted, setTermsAccepted] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  function handleTermsChange(checked) {
    setTermsAccepted(checked);
    try {
      if (checked) localStorage.setItem(storageKey, "1");
      else localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }

  async function handleToggle(key, val) {
    if (!termsAccepted) return;
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

  async function handlePushToggle(enabled) {
    if (!termsAccepted && enabled) return;
    setPushLoading(true);
    try {
      if (enabled) {
        const token = await requestPushPermission();
        await apiFetch("/api/auth/fcm-token", { method: "PUT", body: { fcmToken: token } });
        setUser((u) => ({ ...u, fcmToken: token }));
        setPushEnabled(true);
        showToast("Push notifications enabled", "success");
      } else {
        await disablePushNotifications();
        await apiFetch("/api/auth/fcm-token", { method: "PUT", body: { fcmToken: null } });
        setUser((u) => ({ ...u, fcmToken: null }));
        setPushEnabled(false);
        showToast("Push notifications disabled", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to update push notifications", "error");
    } finally {
      setPushLoading(false);
    }
  }

  async function handleAllowAll() {
    if (!termsAccepted) return;
    const allOn = Object.fromEntries(NOTIF_ROWS.map((r) => [r.key, true]));
    setUser((u) => ({ ...u, notificationPreferences: allOn }));
    setSaving(true);
    try {
      await apiFetch("/api/users/me", { method: "PUT", body: { notificationPreferences: allOn } });
      showToast("All notifications enabled", "success");
    } catch {
      setUser((u) => ({ ...u, notificationPreferences: prefs }));
      showToast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
    if (pushAvailable && !pushEnabled) {
      await handlePushToggle(true);
    }
  }

  const allEnabled = NOTIF_ROWS.every((r) => !!prefs[r.key]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Consent card ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 16, border: termsAccepted ? "1px solid rgba(249,115,22,.3)" : "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: termsAccepted ? "rgba(249,115,22,.1)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`fas fa-${termsAccepted ? "bell" : "lock"}`} style={{ fontSize: "1.5rem", color: termsAccepted ? "var(--accent)" : "var(--ink-3)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>Notification consent</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>
              {termsAccepted ? "Consent given — you can manage your preferences below." : "Accept the terms below to enable notifications."}
            </div>
          </div>
        </div>

        {/* T&C checkbox */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 14px", background: "var(--surface)", borderRadius: "var(--r-md)", marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => handleTermsChange(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
          />
          <span style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
            I agree to receive notifications from UMP in accordance with the{" "}
            <span onClick={(e) => { e.preventDefault(); navigate("/terms"); }} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>Terms of Service</span>
            {" "}and{" "}
            <span onClick={(e) => { e.preventDefault(); navigate("/privacy"); }} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>Privacy Policy</span>.
            I understand I can opt out at any time from these settings.
          </span>
        </label>

        {/* Allow all button */}
        <button
          className="btn btn-primary btn-block"
          disabled={!termsAccepted || saving || allEnabled}
          onClick={handleAllowAll}
        >
          {saving
            ? <><i className="fas fa-spinner fa-spin" /> Saving…</>
            : allEnabled && termsAccepted
            ? <><i className="fas fa-circle-check" /> All notifications enabled</>
            : <><i className="fas fa-bell" /> Allow all notifications</>}
        </button>
        {!termsAccepted && (
          <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>
            Check the box above to continue
          </div>
        )}
      </div>

      {/* ── Push notifications card ───────────────────────────────────── */}
      {pushAvailable && (
        <div className="card" style={{ padding: 16, opacity: termsAccepted ? 1 : 0.45, pointerEvents: termsAccepted ? "auto" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: pushLoading ? 14 : 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: pushEnabled ? "rgba(249,115,22,.1)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="fas fa-mobile-screen-button" style={{ fontSize: "1.5rem", color: pushEnabled ? "var(--accent)" : "var(--ink-3)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>Push notifications</div>
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>
                {pushEnabled ? "Real-time alerts on this device are active." : "Get alerts even when the app is closed."}
              </div>
            </div>
            <Toggle checked={pushEnabled} onChange={handlePushToggle} disabled={pushLoading || !termsAccepted} />
          </div>
          {pushLoading && (
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fas fa-spinner fa-spin" /> {pushEnabled ? "Disabling…" : "Requesting permission…"}
            </div>
          )}
        </div>
      )}

      {/* ── Per-category preferences ──────────────────────────────────── */}
      <div className="card" style={{ padding: "4px 0", opacity: termsAccepted ? 1 : 0.45, pointerEvents: termsAccepted ? "auto" : "none" }}>
        <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>Email & in-app notifications</div>
          <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>Choose which updates you want to receive.</div>
        </div>
        {NOTIF_ROWS.map((row, i) => (
          <div key={row.key} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: i < NOTIF_ROWS.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`fas fa-${row.icon}`} style={{ fontSize: "1.5rem", color: "var(--accent)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>{row.desc}</div>
            </div>
            <Toggle checked={!!prefs[row.key]} onChange={(v) => handleToggle(row.key, v)} disabled={saving || !termsAccepted} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verify account tab (for limited Google accounts) ────────────────────────
function VerifyTab({ user, setUser, showToast }) {
  const [matric, setMatric]             = useState(() => (user?.schoolEmail || "").replace(DOMAIN, ""));
  const [otp, setOtp]                   = useState("");
  const [step, setStep]                 = useState(user?.schoolEmail && !user?.schoolEmailVerified ? "otp" : "email");
  const [sending, setSending]           = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [countdown, setCountdown]       = useState(0);

  const schoolEmail = matric.trim() ? `${matric.trim()}${DOMAIN}` : "";

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function requestOtp() {
    if (!schoolEmail) return showToast("Enter your matric number first", "error");
    setSending(true);
    try {
      await apiFetch("/api/auth/link-school-email", { method: "POST", body: { schoolEmail } });
      showToast("OTP sent to your school email", "success");
      setStep("otp");
      setCountdown(60);
    } catch (err) {
      showToast(err?.message || "Failed to send OTP", "error");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!otp) return showToast("Enter the OTP", "error");
    setVerifying(true);
    try {
      const data = await apiFetch("/api/auth/verify-school-email", { method: "POST", body: { otp } });
      setUser((u) => ({ ...u, ...data.user }));
      showToast("School email verified! Full access unlocked.", "success");
    } catch (err) {
      showToast(err?.message || "Invalid or expired OTP", "error");
    } finally {
      setVerifying(false);
    }
  }

  if (user?.isVerified && user?.schoolEmailVerified) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-circle-check" style={{ color: "#16a34a", fontSize: "2rem" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem" }}>Account verified</div>
            <div style={{ color: "var(--ink-3)", fontSize: "1.25rem", marginTop: 2 }}>
              Linked to <strong>{user.schoolEmail}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f97316", marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#9a3412" }}>Limited account</div>
            <div style={{ fontSize: "1.25rem", color: "#c2410c", marginTop: 4, lineHeight: 1.5 }}>
              You signed in with <strong>{user?.email}</strong>. Link your UNILAG student email to unlock selling, listing, and service features.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 700 }}>Link your school email</h3>
        <p style={{ fontSize: "1.25rem", color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Enter your UNILAG matric number. We'll send a one-time code to confirm you're a student.
        </p>

        <div className="label" style={{ marginBottom: 6 }}>UNILAG matric number</div>
        <div style={{
          display: "flex", border: `1.5px solid ${step === "otp" ? "var(--line)" : "var(--line)"}`,
          borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--white)",
          opacity: step === "otp" ? 0.6 : 1,
          transition: "border-color .2s",
        }}
          onFocusCapture={(e) => { if (step !== "otp") e.currentTarget.style.borderColor = "var(--accent)"; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
        >
          <input
            style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: "1.4rem", fontFamily: "var(--font-sans)", background: "transparent", color: "var(--ink-1)", minWidth: 0 }}
            placeholder="e.g. 190401234"
            value={matric}
            onChange={(e) => setMatric(e.target.value.replace(/\s/g, ""))}
            disabled={step === "otp"}
          />
          <div style={{ padding: "0 14px", background: "var(--surface)", borderLeft: "1.5px solid var(--line)", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: "1.25rem", color: "var(--ink-2)", fontWeight: 500, flexShrink: 0 }}>
            {DOMAIN}
          </div>
        </div>
        <div style={{ height: 12 }} />

        {step === "email" ? (
          <button className="btn btn-primary btn-block" onClick={requestOtp} disabled={sending || !matric.trim()}>
            {sending ? <><i className="fas fa-spinner fa-spin" /> Sending…</> : "Send verification code"}
          </button>
        ) : (
          <>
            <div className="label">Verification code</div>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <div style={{ height: 8 }} />
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 16 }}>
              Code sent to <strong>{schoolEmail}</strong>.{" "}
              {countdown > 0 ? (
                <span>Resend in {countdown}s</span>
              ) : (
                <button
                  style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
                  onClick={() => { setStep("email"); setOtp(""); }}
                >
                  Change or resend
                </button>
              )}
            </div>
            <button className="btn btn-primary btn-block" onClick={verifyOtp} disabled={verifying || otp.length !== 6}>
              {verifying ? <><i className="fas fa-spinner fa-spin" /> Verifying…</> : "Verify and unlock full access"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useUser();
  const showToast = useToast();

  const TABS = user?.isLimitedAccount ? [...BASE_TABS, "Verify"] : BASE_TABS;

  const defaultTab = searchParams.get("tab") === "verify" && user?.isLimitedAccount
    ? "Verify"
    : "Profile";
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="page">
      <Navbar />

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Settings</h1>
        </div>

        {/* tabs */}
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: "10px 14px", border: "none", background: "transparent", fontSize: "1.4rem", fontWeight: 600, color: tab === t ? "var(--accent)" : "var(--ink-3)", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
              >
                {t}
                {t === "Verify" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", display: "inline-block", flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 16px 100px" }}>
          {tab === "Profile"       && <ProfileTab       user={user} setUser={setUser} showToast={showToast} />}
          {tab === "Security"      && <SecurityTab      user={user} showToast={showToast} onAccountDeleted={() => { setUser(null); navigate("/login"); }} />}
          {tab === "Notifications" && <NotificationsTab user={user} setUser={setUser} showToast={showToast} />}
          {tab === "Verify"        && <VerifyTab        user={user} setUser={setUser} showToast={showToast} />}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
