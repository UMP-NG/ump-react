import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../utils/api";
import { isPushSupported } from "../utils/pushNotification";
import { subscribeToPush, unsubscribeFromPush } from "../utils/push";
import ImageCropModal from "../components/ImageCropModal";
import { NIGERIAN_INSTITUTIONS, NIGERIAN_FACULTIES, NIGERIAN_DEPARTMENTS, FACULTY_DEPARTMENTS } from "../data/nigerianInstitutions";
import { useTheme } from "../components/Navbar";

const DOMAIN = "@live.unilag.edu.ng";
const BASE_TABS = ["Profile", "Security", "Notifications", "Appearance"];


const UNILAG_SETUP_STEPS = [
  { n: 1, text: "Go to portal.office.com and click Sign in" },
  { n: 2, text: "Enter your matric number email, e.g. 190401234@live.unilag.edu.ng" },
  { n: 3, text: "Use the temporary password sent to you by UNILAG (ABS-CITS)" },
  { n: 4, text: "You will be asked to change your password and set up recovery options" },
  { n: 5, text: "Once in, open Outlook — your OTP from UMP will arrive there" },
];

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

// ─── Referral section ─────────────────────────────────────────────────────────
function ReferralSection({ user }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referralCount, setReferralCount] = useState(null);
  const [creditBalance, setCreditBalance] = useState(user?.referralCredit || 0);
  const [liveCode, setLiveCode] = useState(user?.referralCode || "");
  const code = liveCode;
  const referralLink = code ? `${window.location.origin}/login?ref=${code}` : "";

  useEffect(() => {
    apiFetch("/api/auth/referral/stats")
      .then((d) => {
        setReferralCount(d.count ?? 0);
        if (d.referralCode) setLiveCode(d.referralCode);
        if (typeof d.creditBalance === "number") setCreditBalance(d.creditBalance);
      })
      .catch(() => {});
  }, []);

  function copyText(text, setCopied) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function shareLink() {
    const text = `Join UMP — the UNILAG campus marketplace! Sign up with my referral link: ${referralLink}`;
    if (navigator.share) {
      navigator.share({ title: "Join UMP", text, url: referralLink }).catch(() => {});
    } else {
      copyText(referralLink, setCopiedLink);
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <SectionLabel title="Referral" />
      <div style={{ padding: "16px", background: "var(--surface)", borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>
          <i className="fas fa-gift" style={{ marginRight: 7, color: "var(--accent)" }} />
          Refer friends to UMP
        </div>
        <p style={{ fontSize: "1.2rem", color: "var(--ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Earn <strong>₦100</strong> when a friend signs up with a school email, or <strong>₦50 + ₦50</strong> for a Google sign-up once verified. Credits can only be spent on UMP — not withdrawn.
        </p>

        {/* Credit wallet card */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: creditBalance > 0 ? "linear-gradient(135deg,rgba(249,115,22,.12),rgba(249,115,22,.04))" : "var(--surface)", border: `1.5px solid ${creditBalance > 0 ? "rgba(249,115,22,.35)" : "var(--line)"}`, borderRadius: "var(--r-md)", marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: creditBalance > 0 ? "var(--accent)" : "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fas fa-wallet" style={{ color: "#fff", fontSize: "1.4rem" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Referral Credit Balance</div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: creditBalance > 0 ? "var(--accent)" : "var(--ink-3)", lineHeight: 1.2 }}>
              ₦{creditBalance.toLocaleString("en-NG")}
            </div>
          </div>
          {creditBalance > 0 && (
            <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", textAlign: "right", lineHeight: 1.5 }}>
              Use at<br />checkout &<br />booking
            </div>
          )}
        </div>

        {/* Reward breakdown info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { icon: "envelope", label: "School email signup", value: "₦100" },
            { icon: "google brands", label: "Google signup", value: "₦50" },
            { icon: "circle-check", label: "Google verifies email", value: "+₦50" },
          ].map((r) => (
            <div key={r.label} style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <i className={`fa${r.icon.includes("brands") ? "b" : "s"} fa-${r.icon.replace(" brands","")}`} style={{ color: "var(--accent)", width: 16, textAlign: "center" }} />
              <div style={{ flex: 1, fontSize: "1.15rem", color: "var(--ink-2)", lineHeight: 1.3 }}>{r.label}</div>
              <strong style={{ color: "var(--accent)", fontSize: "1.3rem", flexShrink: 0 }}>{r.value}</strong>
            </div>
          ))}
        </div>

        {/* Stats */}
        {referralCount !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: referralCount > 0 ? "rgba(249,115,22,.06)" : "var(--surface)", border: `1px solid ${referralCount > 0 ? "rgba(249,115,22,.2)" : "var(--line)"}`, borderRadius: "var(--r-md)", marginBottom: 16 }}>
            <i className="fas fa-users" style={{ color: referralCount > 0 ? "var(--accent)" : "var(--ink-3)", fontSize: "1.4rem" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.3rem", color: referralCount > 0 ? "var(--ink-1)" : "var(--ink-3)" }}>
                {referralCount === 0 ? "No referrals yet" : `${referralCount} user${referralCount !== 1 ? "s" : ""} joined with your code`}
              </div>
              {referralCount === 0 && (
                <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 2 }}>Share your link below to get started</div>
              )}
            </div>
          </div>
        )}

        <div className="label" style={{ marginBottom: 6 }}>Referral code</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
          <div style={{ flex: 1, background: "var(--white)", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 14px", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "0.08em", color: code ? "var(--ink-1)" : "var(--ink-4)", fontFamily: "monospace" }}>
            {code || "Generating…"}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => copyText(code, setCopiedCode)}
            disabled={!code}
            style={{ flexShrink: 0, gap: 6 }}
          >
            <i className={`fas fa-${copiedCode ? "check" : "copy"}`} style={{ color: copiedCode ? "#16a34a" : undefined }} />
            {copiedCode ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Link row */}
        <div className="label" style={{ marginBottom: 6 }}>Referral link</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, background: "var(--white)", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 14px", fontSize: "1.15rem", color: code ? "var(--ink-2)" : "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {referralLink || "—"}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => copyText(referralLink, setCopiedLink)}
            disabled={!code}
            style={{ flexShrink: 0, gap: 6 }}
          >
            <i className={`fas fa-${copiedLink ? "check" : "copy"}`} style={{ color: copiedLink ? "#16a34a" : undefined }} />
            {copiedLink ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={shareLink}
          disabled={!code}
          style={{ gap: 8 }}
        >
          <i className="fas fa-share-nodes" /> Share referral link
        </button>

        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(249,115,22,.06)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
          <i className="fas fa-info-circle" style={{ marginRight: 6, color: "var(--accent)" }} />
          New users can enter your <strong>code</strong> in the referral field at signup, or just open your <strong>link</strong> — it fills in automatically.
        </div>
      </div>
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

    <ReferralSection user={user} />
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
  const [pwSetForm, setPwSetForm] = useState({ newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [show2, setShow2] = useState({ new: false, confirm: false });
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const allRulesMet = STRENGTH_RULES.every((r) => r.test(form.newPassword));
  const confirmMatch = form.confirm && form.newPassword === form.confirm;
  const confirmMismatch = form.confirm && form.newPassword !== form.confirm;

  const allRulesMet2 = STRENGTH_RULES.every((r) => r.test(pwSetForm.newPassword));
  const confirmMatch2 = pwSetForm.confirm && pwSetForm.newPassword === pwSetForm.confirm;
  const confirmMismatch2 = pwSetForm.confirm && pwSetForm.newPassword !== pwSetForm.confirm;

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

  async function handleSetPassword(e) {
    e.preventDefault();
    if (!allRulesMet2) return showToast("Password doesn't meet all requirements", "error");
    if (pwSetForm.newPassword !== pwSetForm.confirm) return showToast("Passwords don't match", "error");
    setSavingSet(true);
    try {
      await apiFetch("/api/auth/set-password", {
        method: "PUT",
        body: { newPassword: pwSetForm.newPassword },
      });
      showToast("Password set! You can now log in with your school email.", "success");
      setPwSetForm({ newPassword: "", confirm: "" });
    } catch (err) {
      showToast(err?.message || "Failed to set password", "error");
    } finally {
      setSavingSet(false);
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
        {isGoogleAccount && user?.schoolEmailVerified ? (
          <form onSubmit={handleSetPassword}>
            <div style={{ padding: "10px 14px", background: "var(--surface)", borderRadius: "var(--r-md)", fontSize: "1.25rem", color: "var(--ink-2)", marginBottom: 14 }}>
              <i className="fab fa-google" style={{ marginRight: 8, color: "#4285f4" }} />
              Your school email is verified. Set a password to also log in with your school email.
            </div>
            <PasswordField label="New password" value={pwSetForm.newPassword} onChange={(e) => setPwSetForm((f) => ({ ...f, newPassword: e.target.value }))} visible={show2.new} onToggle={() => setShow2((s) => ({ ...s, new: !s.new }))}>
              <StrengthMeter password={pwSetForm.newPassword} />
            </PasswordField>
            <PasswordField label="Confirm password" value={pwSetForm.confirm} onChange={(e) => setPwSetForm((f) => ({ ...f, confirm: e.target.value }))} visible={show2.confirm} onToggle={() => setShow2((s) => ({ ...s, confirm: !s.confirm }))} />
            {confirmMismatch2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "#ef4444", marginTop: -6, marginBottom: 12 }}>
                <i className="fas fa-circle-xmark" /> Passwords don't match
              </div>
            )}
            {confirmMatch2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", color: "#16a34a", marginTop: -6, marginBottom: 12 }}>
                <i className="fas fa-circle-check" /> Passwords match
              </div>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={savingSet || !allRulesMet2 || !!confirmMismatch2}>
              {savingSet ? <><i className="fas fa-spinner fa-spin" /> Setting…</> : "Set password"}
            </button>
          </form>
        ) : isGoogleAccount ? (
          <div style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: "var(--r-md)", fontSize: "1.3rem", color: "var(--ink-2)" }}>
            <i className="fab fa-google" style={{ marginRight: 8, color: "#4285f4" }} />
            Verify your school email first (in the Verify tab) to enable password login.
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
  const [pushEnabled, setPushEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const [pushLoading, setPushLoading] = useState(false);
  const pushAvailable = isPushSupported();

  // Keep pushEnabled in sync with real browser permission state
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

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
        const result = await subscribeToPush();
        if (result === "granted") {
          setPushEnabled(true);
          showToast("Push notifications enabled", "success");
        } else if (result === "denied") {
          showToast("Notification permission denied — enable it in your browser settings.", "error");
        } else if (result === "unsupported") {
          showToast("Push notifications are not supported on this device.", "error");
        } else {
          showToast("Could not enable push notifications. Try again.", "error");
        }
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        showToast("Push notifications disabled", "success");
      }
    } catch (err) {
      showToast(err?.message || "Failed to update push notifications", "error");
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
  // Which path the user chose
  const [path, setPath]                 = useState(null); // null | "email" | "document"

  // --- Email path ---
  const [matric, setMatric]             = useState(() => (user?.schoolEmail || "").replace(DOMAIN, ""));
  const [otp, setOtp]                   = useState("");
  const [emailStep, setEmailStep]       = useState(user?.schoolEmail && !user?.schoolEmailVerified ? "otp" : "email");
  const [sending, setSending]           = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const [showEmailHelp, setShowEmailHelp] = useState(false);

  // --- Document path ---
  const [docForm, setDocForm] = useState({ institution: "", firstName: "", middleName: "", lastName: "", matricNumber: "", department: "", faculty: "" });
  const [docFile, setDocFile]       = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docError, setDocError]     = useState(null);
  const [docRequest, setDocRequest] = useState(null);   // existing request from server
  const [docLoaded, setDocLoaded]   = useState(false);

  // --- Dispute ---
  const [disputeText, setDisputeText]     = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const schoolEmail = matric.trim() ? `${matric.trim()}${DOMAIN}` : "";

  // Load existing document request on mount
  useEffect(() => {
    apiFetch("/api/auth/verify-identity/status")
      .then((d) => {
        setDocRequest(d.request || null);
        if (d.request) setPath("document");
        setDocLoaded(true);
      })
      .catch(() => setDocLoaded(true));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Email path handlers
  async function requestOtp() {
    if (!schoolEmail) return showToast("Enter your matric number first", "error");
    setSending(true);
    try {
      await apiFetch("/api/auth/link-school-email", { method: "POST", body: { schoolEmail } });
      showToast("OTP sent to your school email", "success");
      setEmailStep("otp");
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

  // Document path handlers
  function handleDocFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDocFile(file);
    const reader = new FileReader();
    reader.onload = () => setDocPreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submitDocForm(e) {
    e.preventDefault();
    const institution = docForm.institution === "__other__" ? "" : docForm.institution;
    const faculty     = docForm.faculty     === "__other__" ? "" : docForm.faculty;
    const department  = docForm.department  === "__other__" ? "" : docForm.department;
    const { firstName, lastName, matricNumber } = docForm;
    if (!institution || !firstName || !lastName || !matricNumber || !department || !faculty) {
      return showToast("Please fill in all required fields", "error");
    }
    if (!docFile) return showToast("Please upload a school document", "error");

    setSubmitting(true);
    setDocError(null);
    try {
      // 1. Upload the document image
      setUploading(true);
      const fd = new FormData();
      fd.append("file", docFile);
      const uploadRes = await apiFetch("/api/upload", { method: "POST", body: fd });
      setUploading(false);
      if (!uploadRes.url) throw new Error("Document upload failed — please try again.");

      // 2. Submit the form
      const res = await apiFetch("/api/auth/verify-identity", {
        method: "POST",
        body: {
          institution,
          faculty,
          department,
          firstName:    docForm.firstName,
          middleName:   docForm.middleName,
          lastName:     docForm.lastName,
          matricNumber: matricNumber.trim().toUpperCase(),
          documentUrl:      uploadRes.url,
          documentPublicId: uploadRes.publicId || "",
        },
      });

      setDocRequest({ status: res.status, matricNumber: docForm.matricNumber.toUpperCase(), institution: docForm.institution });
      showToast(res.message, "success");
    } catch (err) {
      const msg = err?.message || "Submission failed. Please check your connection and try again.";
      setDocError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  async function submitDispute(e) {
    e.preventDefault();
    if (!disputeText.trim()) return showToast("Please explain your case", "error");
    setDisputeSubmitting(true);
    try {
      await apiFetch("/api/auth/verify-identity/dispute", { method: "POST", body: { reason: disputeText } });
      showToast("Dispute submitted — an admin will review both accounts", "success");
      setDocRequest((r) => ({ ...r, disputeReason: disputeText, disputeRaisedAt: new Date().toISOString() }));
    } catch (err) {
      showToast(err?.message || "Failed to submit dispute", "error");
    } finally {
      setDisputeSubmitting(false);
    }
  }

  // ── Already fully verified ────────────────────────────────────────────────
  if (user?.isVerified && !user?.isLimitedAccount) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-circle-check" style={{ color: "#16a34a", fontSize: "2rem" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem" }}>Account verified</div>
            <div style={{ color: "var(--ink-3)", fontSize: "1.25rem", marginTop: 2 }}>
              {user.schoolEmail
                ? <>Linked to <strong>{user.schoolEmail}</strong></>
                : "Your student identity has been confirmed by UMP."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const docStatusBanner = docRequest ? (() => {
    const s = docRequest.status;
    if (s === "pending")  return { bg: "#fefce8", border: "#fde68a", icon: "fa-clock", color: "#92400e", title: "Under review", msg: "Your documents are being reviewed by the UMP team. This usually takes 1–2 business days." };
    if (s === "approved") return { bg: "#f0fdf4", border: "#bbf7d0", icon: "fa-circle-check", color: "#16a34a", title: "Approved", msg: "Your identity has been verified." };
    if (s === "rejected") return { bg: "#fef2f2", border: "#fecaca", icon: "fa-circle-xmark", color: "#dc2626", title: "Rejected", msg: docRequest.adminNote || "Please re-submit with clearer documents." };
    if (s === "conflict") return { bg: "#fff7ed", border: "#fed7aa", icon: "fa-triangle-exclamation", color: "#f97316", title: "Identity conflict", msg: `Matric number ${docRequest.matricNumber} is already linked to another account. If you are the rightful owner, raise a dispute below.` };
    return null;
  })() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Limited account warning */}
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f97316", marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#9a3412" }}>Limited account</div>
            <div style={{ fontSize: "1.25rem", color: "#c2410c", marginTop: 4, lineHeight: 1.5 }}>
              You signed in with <strong>{user?.email}</strong>. Verify your student identity to unlock selling, listing, and service features.
            </div>
          </div>
        </div>
      </div>

      {/* Path picker — only show if no doc request in progress */}
      {!docRequest && !path && docLoaded && (
        <div>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: 12, color: "var(--ink-1)" }}>Choose a verification method</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => setPath("email")}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "2px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--paper)", cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(249,115,22,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="fas fa-envelope-circle-check" style={{ color: "var(--accent)", fontSize: "1.5rem" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--ink-1)" }}>Link my school email</div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>I have access to my {DOMAIN} email address</div>
              </div>
              <i className="fas fa-chevron-right" style={{ marginLeft: "auto", color: "var(--ink-4)" }} />
            </button>

            <button
              type="button"
              onClick={() => setPath("document")}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "2px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--paper)", cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="fas fa-id-card" style={{ color: "#3b82f6", fontSize: "1.5rem" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--ink-1)" }}>Submit student documents</div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>I don't have my school email — verify via form + school document photo</div>
              </div>
              <i className="fas fa-chevron-right" style={{ marginLeft: "auto", color: "var(--ink-4)" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── PATH A: Link school email ── */}
      {path === "email" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <button type="button" className="icon-btn" onClick={() => setPath(null)} style={{ marginRight: 4 }}><i className="fas fa-arrow-left" /></button>
            <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Link your school email</h3>
          </div>
          <p style={{ fontSize: "1.25rem", color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.5 }}>
            Enter your UNILAG matric number. We'll send a one-time code to your school inbox.
          </p>

          {/* How to find email accordion */}
          <div style={{ marginBottom: 20, border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            <button type="button" aria-expanded={showEmailHelp} onClick={() => setShowEmailHelp((v) => !v)}
              style={{ width: "100%", background: "var(--surface)", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fas fa-circle-question" style={{ color: "var(--accent)", fontSize: "1.3rem" }} />
                <span style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-1)" }}>How do I find my UNILAG student email?</span>
              </div>
              <i className={`fas fa-chevron-${showEmailHelp ? "up" : "down"}`} style={{ color: "var(--ink-3)", fontSize: "1.1rem" }} />
            </button>
            {showEmailHelp && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--line)" }}>
                <p style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.6, margin: "12px 0 10px" }}>UNILAG sends every student an institutional email. It looks like: <strong>190401234@live.unilag.edu.ng</strong></p>
                {UNILAG_SETUP_STEPS.map(({ n, text }) => (
                  <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{n}</div>
                    <span style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
                <a href="https://portal.office.com" target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#0078d4", color: "#fff", borderRadius: 10, textDecoration: "none", fontSize: "1.3rem", fontWeight: 600, marginTop: 12 }}>
                  <i className="fas fa-arrow-up-right-from-square" /> Open Microsoft 365 (portal.office.com)
                </a>
              </div>
            )}
          </div>

          <div className="label" style={{ marginBottom: 6 }}>UNILAG matric number</div>
          <div style={{ display: "flex", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--white)", opacity: emailStep === "otp" ? 0.6 : 1 }}
            onFocusCapture={(e) => { if (emailStep !== "otp") e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}>
            <input style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: "1.4rem", fontFamily: "var(--font-sans)", background: "transparent", color: "var(--ink-1)", minWidth: 0 }}
              placeholder="e.g. 190401234" value={matric} onChange={(e) => setMatric(e.target.value.replace(/\s/g, ""))} disabled={emailStep === "otp"} />
            <div style={{ padding: "0 14px", background: "var(--surface)", borderLeft: "1.5px solid var(--line)", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: "1.25rem", color: "var(--ink-2)", fontWeight: 500, flexShrink: 0 }}>{DOMAIN}</div>
          </div>
          <div style={{ height: 12 }} />

          {emailStep === "email" ? (
            <button className="btn btn-primary btn-block" onClick={requestOtp} disabled={sending || !matric.trim()}>
              {sending ? <><i className="fas fa-spinner fa-spin" /> Sending…</> : "Send verification code"}
            </button>
          ) : (
            <>
              <div className="label">Verification code</div>
              <input className="input" type="text" inputMode="numeric" placeholder="6-digit code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <div style={{ height: 8 }} />
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 16 }}>
                Code sent to <strong>{schoolEmail}</strong>.{" "}
                {countdown > 0 ? <span>Resend in {countdown}s</span> : (
                  <button style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }} onClick={() => { setEmailStep("email"); setOtp(""); }}>Change or resend</button>
                )}
              </div>
              <button className="btn btn-primary btn-block" onClick={verifyOtp} disabled={verifying || otp.length !== 6}>
                {verifying ? <><i className="fas fa-spinner fa-spin" /> Verifying…</> : "Verify and unlock full access"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PATH B: Document-based verification ── */}
      {path === "document" && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            {!docRequest && <button type="button" className="icon-btn" onClick={() => setPath(null)} style={{ marginRight: 4 }}><i className="fas fa-arrow-left" /></button>}
            <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Student Identity Verification</h3>
          </div>

          {/* Status banner for existing request */}
          {docStatusBanner && (
            <div style={{ padding: "14px 16px", background: docStatusBanner.bg, border: `1px solid ${docStatusBanner.border}`, borderRadius: "var(--r-md)", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <i className={`fas ${docStatusBanner.icon}`} style={{ color: docStatusBanner.color, fontSize: "1.5rem", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.35rem", color: docStatusBanner.color }}>{docStatusBanner.title}</div>
                <div style={{ fontSize: "1.25rem", color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>{docStatusBanner.msg}</div>
              </div>
            </div>
          )}

          {/* Dispute form — shown when conflict detected and no dispute raised yet */}
          {docRequest?.status === "conflict" && !docRequest.disputeRaisedAt && (
            <form onSubmit={submitDispute} style={{ marginBottom: 20, padding: "16px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.25)", borderRadius: "var(--r-md)" }}>
              <div style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 8, color: "var(--ink-1)" }}>
                <i className="fas fa-scale-balanced" style={{ marginRight: 7, color: "var(--accent)" }} />Raise a dispute
              </div>
              <p style={{ fontSize: "1.2rem", color: "var(--ink-2)", margin: "0 0 12px", lineHeight: 1.5 }}>Explain why you are the rightful owner of this matric number. The admin will investigate both accounts.</p>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. I am the original owner of this matric number. I never created a UMP account before..."
                value={disputeText}
                onChange={(e) => setDisputeText(e.target.value)}
                style={{ width: "100%", resize: "none", marginBottom: 12 }}
              />
              <button className="btn btn-primary btn-block" type="submit" disabled={disputeSubmitting || !disputeText.trim()}>
                {disputeSubmitting ? <><i className="fas fa-spinner fa-spin" /> Submitting…</> : <><i className="fas fa-flag" /> Submit dispute</>}
              </button>
            </form>
          )}

          {docRequest?.status === "conflict" && docRequest.disputeRaisedAt && (
            <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-md)", marginBottom: 20, fontSize: "1.25rem", color: "#15803d" }}>
              <i className="fas fa-circle-check" style={{ marginRight: 6 }} />Dispute submitted — the admin will review both accounts and get back to you.
            </div>
          )}

          {/* Re-submit button for rejected requests */}
          {docRequest?.status === "rejected" && (
            <button
              type="button"
              className="btn btn-outline btn-block"
              style={{ marginBottom: 4 }}
              onClick={() => { setDocRequest(null); setDocFile(null); setDocPreview(null); setDocError(null); setDocForm({ institution: "", firstName: "", middleName: "", lastName: "", matricNumber: "", department: "", faculty: "" }); }}
            >
              <i className="fas fa-rotate-right" /> Re-submit documents
            </button>
          )}

          {/* Main form — only shown when no existing request (cleared on re-submit) */}
          {!docRequest && (
            <form onSubmit={submitDocForm}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Institution / School name *</div>
                  <select
                    className="input"
                    value={!docForm.institution ? "" : NIGERIAN_INSTITUTIONS.includes(docForm.institution) ? docForm.institution : "__other__"}
                    onChange={(e) => setDocForm({ ...docForm, institution: e.target.value === "__other__" ? "__other__" : e.target.value })}
                  >
                    <option value="">-- Select institution --</option>
                    {NIGERIAN_INSTITUTIONS.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
                    <option value="__other__">Other (type below)</option>
                  </select>
                  {(docForm.institution === "__other__" || (!NIGERIAN_INSTITUTIONS.includes(docForm.institution) && docForm.institution && docForm.institution !== "")) && (
                    <input className="input" style={{ marginTop: 8 }} placeholder="Enter your institution name"
                      value={docForm.institution === "__other__" ? "" : docForm.institution}
                      onChange={(e) => setDocForm({ ...docForm, institution: e.target.value })} required />
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>First name *</div>
                    <input className="input" placeholder="Aisha" value={docForm.firstName} onChange={(e) => setDocForm({ ...docForm, firstName: e.target.value })} required />
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>Middle name</div>
                    <input className="input" placeholder="(optional)" value={docForm.middleName} onChange={(e) => setDocForm({ ...docForm, middleName: e.target.value })} />
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>Last name *</div>
                    <input className="input" placeholder="Ogundimu" value={docForm.lastName} onChange={(e) => setDocForm({ ...docForm, lastName: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Matric number *</div>
                  <input className="input" placeholder="e.g. 190401234" value={docForm.matricNumber} onChange={(e) => setDocForm({ ...docForm, matricNumber: e.target.value.replace(/\s/g, "").toUpperCase() })} required style={{ textTransform: "uppercase", letterSpacing: "0.04em" }} />
                </div>

                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Faculty *</div>
                  <select
                    className="input"
                    value={!docForm.faculty ? "" : NIGERIAN_FACULTIES.includes(docForm.faculty) ? docForm.faculty : "__other__"}
                    onChange={(e) => {
                      const val = e.target.value === "__other__" ? "__other__" : e.target.value;
                      setDocForm({ ...docForm, faculty: val, department: "" });
                    }}
                  >
                    <option value="">-- Select faculty / school --</option>
                    {NIGERIAN_FACULTIES.map((f) => <option key={f} value={f}>{f}</option>)}
                    <option value="__other__">Other (type below)</option>
                  </select>
                  {(docForm.faculty === "__other__" || (!NIGERIAN_FACULTIES.includes(docForm.faculty) && docForm.faculty && docForm.faculty !== "")) && (
                    <input className="input" style={{ marginTop: 8 }} placeholder="Enter your faculty / school"
                      value={docForm.faculty === "__other__" ? "" : docForm.faculty}
                      onChange={(e) => setDocForm({ ...docForm, faculty: e.target.value, department: "" })} required />
                  )}
                </div>

                <div>
                  {(() => {
                    const activeFaculty = NIGERIAN_FACULTIES.includes(docForm.faculty) ? docForm.faculty : null;
                    const deptList = activeFaculty ? (FACULTY_DEPARTMENTS[activeFaculty] || NIGERIAN_DEPARTMENTS) : NIGERIAN_DEPARTMENTS;
                    const deptInList = deptList.includes(docForm.department);
                    return (
                      <>
                        <div className="label" style={{ marginBottom: 6 }}>Department *</div>
                        <select
                          className="input"
                          value={!docForm.department ? "" : deptInList ? docForm.department : "__other__"}
                          onChange={(e) => setDocForm({ ...docForm, department: e.target.value === "__other__" ? "__other__" : e.target.value })}
                        >
                          <option value="">-- Select department --</option>
                          {deptList.map((d) => <option key={d} value={d}>{d}</option>)}
                          <option value="__other__">Other (type below)</option>
                        </select>
                        {(docForm.department === "__other__" || (!deptInList && docForm.department && docForm.department !== "")) && (
                          <input className="input" style={{ marginTop: 8 }} placeholder="Enter your department"
                            value={docForm.department === "__other__" ? "" : docForm.department}
                            onChange={(e) => setDocForm({ ...docForm, department: e.target.value })} required />
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Document upload */}
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>School document *</div>
                  <p style={{ fontSize: "1.2rem", color: "var(--ink-3)", margin: "0 0 10px", lineHeight: 1.5 }}>
                    Upload a clear photo or screenshot of any school document that shows your name and matric number — e.g. student ID card, student portal page, acceptance letter, or school fee receipt.
                  </p>
                  {docPreview ? (
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <img src={docPreview} alt="Document preview" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", opacity: uploading ? 0.5 : 1 }} />
                      {uploading && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--r-md)", background: "rgba(15,23,42,.35)" }}>
                          <i className="fas fa-spinner fa-spin" style={{ color: "#fff", fontSize: "2rem" }} />
                          <span style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 600 }}>Uploading…</span>
                        </div>
                      )}
                      {!uploading && !submitting && (
                        <button type="button" className="icon-btn" style={{ position: "absolute", top: 6, right: 6, background: "rgba(15,23,42,.7)", color: "#fff" }} onClick={() => { setDocFile(null); setDocPreview(null); }}>
                          <i className="fas fa-xmark" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 14px", border: `2px dashed ${submitting ? "var(--accent)" : "var(--line)"}`, borderRadius: "var(--r-lg)", cursor: submitting ? "default" : "pointer", background: "var(--surface)", color: "var(--ink-3)", opacity: submitting ? 0.6 : 1 }}>
                      {submitting
                        ? <><i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--accent)" }} /><span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--accent)" }}>Uploading…</span></>
                        : <><i className="fas fa-cloud-arrow-up" style={{ fontSize: "2rem" }} /><span style={{ fontSize: "1.25rem", fontWeight: 600 }}>Click to upload document</span><span style={{ fontSize: "1.1rem" }}>JPG, PNG or WebP · Max 5 MB</span></>
                      }
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleDocFileChange} disabled={submitting} />
                    </label>
                  )}
                </div>

                {docError && (
                  <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-md)", fontSize: "1.25rem", color: "#dc2626", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <i className="fas fa-circle-xmark" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{docError}</span>
                  </div>
                )}

                <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting || uploading}>
                  {uploading ? <><i className="fas fa-spinner fa-spin" /> Uploading document…</>
                    : submitting ? <><i className="fas fa-spinner fa-spin" /> Submitting…</>
                    : <><i className="fas fa-paper-plane" /> Submit for verification</>}
                </button>

                <p style={{ fontSize: "1.15rem", color: "var(--ink-3)", textAlign: "center", margin: 0 }}>
                  <i className="fas fa-lock" style={{ marginRight: 5 }} />Your documents are reviewed securely by UMP admins and never shared publicly.
                </p>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Appearance tab ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const [isDark, toggleTheme] = useTheme();
  const options = [
    { id: false, label: "Light", icon: "fa-sun",  desc: "Clean bright interface" },
    { id: true,  label: "Dark",  icon: "fa-moon", desc: "Easy on the eyes at night" },
  ];
  return (
    <div className="card" style={{ padding: "24px 20px" }}>
      <div style={{ fontWeight: 700, fontSize: "1.6rem", marginBottom: 6 }}>Theme</div>
      <div style={{ color: "var(--ink-3)", fontSize: "1.3rem", marginBottom: 20 }}>
        Choose how UMP looks for you. Your preference is saved locally.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {options.map((o) => {
          const active = isDark === o.id;
          return (
            <button
              key={String(o.id)}
              onClick={() => { if (!active) toggleTheme(); }}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, padding: "20px 12px", border: `2px solid ${active ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "var(--r-lg)", background: active ? "rgba(249,115,22,.06)" : "var(--surface)",
                cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all .15s",
              }}
            >
              <i className={`fas ${o.icon}`} style={{ fontSize: "2rem", color: active ? "var(--accent)" : "var(--ink-3)" }} />
              <div style={{ fontWeight: 700, fontSize: "1.4rem", color: active ? "var(--accent)" : "var(--ink-1)" }}>{o.label}</div>
              <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", textAlign: "center" }}>{o.desc}</div>
              {active && <i className="fas fa-check-circle" style={{ color: "var(--accent)", fontSize: "1.4rem" }} />}
            </button>
          );
        })}
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
          {tab === "Appearance"    && <AppearanceTab />}
          {tab === "Verify"        && <VerifyTab        user={user} setUser={setUser} showToast={showToast} />}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
