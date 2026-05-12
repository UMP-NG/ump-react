import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";

const SELLER_CATS  = ["Electronics", "Books", "Fashion", "Food", "Beauty", "Accessories", "Handmade", "Other"];
const SERVICE_CATS = ["Design", "Writing", "Tech / Coding", "Tutoring", "Photography", "Fitness", "Music", "Other"];
const PACKAGES     = ["Basic", "Standard", "Premium"];

const PERKS = [
  { icon: "naira-sign",      text: "Zero setup cost — always free to join" },
  { icon: "bolt",            text: "Paid within 24 hrs after every sale" },
  { icon: "users",           text: "Reach 10,000+ UNILAG students daily" },
  { icon: "shield-halved",   text: "Buyer protection & escrow payments" },
  { icon: "chart-line",      text: "Real-time analytics & sales dashboard" },
];

const STATS = [
  { value: "500+", label: "Active sellers" },
  { value: "₦0",  label: "Setup cost" },
  { value: "24h", label: "Payout time" },
];

export default function Provider() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [tab, setTab]       = useState("seller");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const [seller, setSeller] = useState({
    storeName: "", businessName: "", bio: "",
    category: "", description: "", location: "",
  });

  const [service, setService] = useState({
    nameOrBusiness: "", title: "", category: "",
    shortDescription: "", about: "",
    rate: "", currency: "NGN", package: "",
    duration: "", certifications: "", portfolio: "",
    policies: "", timeSlots: "", isAvailable: false, tags: "",
  });

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiFetch("/api/upload", { method: "POST", body: fd });
    return { url: res.url, publicId: res.publicId || "" };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "seller") {
        const { bannerFile, logoFile, ...sellerData } = seller;
        const [bannerObj, logoObj] = await Promise.all([
          bannerFile ? uploadFile(bannerFile) : Promise.resolve(null),
          logoFile   ? uploadFile(logoFile)   : Promise.resolve(null),
        ]);
        await apiFetch("/api/sellers/profile", {
          method: "POST",
          body: {
            name: sellerData.storeName || sellerData.businessName,
            ...sellerData,
            ...(bannerObj && { banner: bannerObj }),
            ...(logoObj   && { logo:   logoObj }),
          },
        });
      } else {
        const { serviceImageFile, isAvailable, nameOrBusiness, shortDescription, ...rest } = service;
        const imageObj = serviceImageFile ? await uploadFile(serviceImageFile) : null;
        await apiFetch("/api/services/becomeServiceProvider", {
          method: "POST",
          body: {
            name: nameOrBusiness,
            desc: shortDescription,
            available: isAvailable,
            ...rest,
            ...(imageObj && { serviceImageUrl: imageObj.url }),
          },
        });
      }
      navigate(tab === "seller" ? "/seller-dashboard" : "/provider-analytics");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="partner-wrap">
      {/* Mobile top bar */}
      <div className="partner-topbar" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <button className="icon-btn" style={{ background: "var(--surface)" }} onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left" />
        </button>
        <Logo />
        <span style={{ width: 40 }} />
      </div>

      <div className="partner-body">
        {/* Hero sidebar (desktop only, fixed) */}
        <aside className="partner-hero">
          <div className="partner-hero-inner">
            <button
              className="icon-btn"
              style={{ background: "rgba(255,255,255,.1)", color: "#fff", marginBottom: 40, alignSelf: "flex-start" }}
              onClick={() => navigate(-1)}
            >
              <i className="fas fa-arrow-left" />
            </button>

            <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,.18)", border: "1px solid rgba(249,115,22,.4)", borderRadius: "var(--r-pill)", padding: "4px 14px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>Now accepting applications</span>
            </div>

            <h1 style={{ fontSize: "3.2rem", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.03em", margin: "16px 0 12px", color: "#fff" }}>
              Start earning<br />on campus.
            </h1>
            <p style={{ fontSize: "1.5rem", color: "rgba(255,255,255,.65)", lineHeight: 1.6, margin: "0 0 36px" }}>
              Join hundreds of UNILAG students already making money selling products and services right here on campus.
            </p>

            <div style={{ display: "flex", gap: 0, marginBottom: 36, background: "rgba(255,255,255,.07)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              {STATS.map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: "14px 0", textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,.1)" : "none" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{s.value}</div>
                  <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.5)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              {PERKS.map((p) => (
                <div key={p.icon} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(249,115,22,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`fas fa-${p.icon}`} style={{ color: "var(--accent)", fontSize: "1.4rem" }} />
                  </div>
                  <span style={{ fontSize: "1.35rem", color: "rgba(255,255,255,.8)", lineHeight: 1.4 }}>{p.text}</span>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.1)", marginTop: "auto" }}>
              <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,.4)", lineHeight: 1.5, margin: 0 }}>
                Requires active UNILAG student email. Applications reviewed within 24 hours.
              </p>
            </div>
          </div>
        </aside>

        {/* Form column */}
        <div className="partner-form-col">
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
              {/* Mobile heading */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.3)", borderRadius: "var(--r-pill)", padding: "4px 12px", marginBottom: 14 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                  <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>Open applications</span>
                </div>
                <h2 style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 6px", color: "var(--ink-1)" }}>
                  {tab === "seller" ? "🚀 Launch Your Store" : "🧰 Offer Your Expertise"}
                </h2>
                <p style={{ margin: 0, fontSize: "1.4rem", color: "var(--ink-2)" }}>
                  Free to join · Paid within 24 hrs after each {tab === "seller" ? "sale" : "session"}
                </p>
              </div>

              {/* Tab switcher */}
              <div style={{ display: "flex", background: "var(--surface)", borderRadius: "var(--r-pill)", padding: 4, marginBottom: 28 }}>
                {[
                  { key: "seller",   icon: "store",             label: "Become a Seller" },
                  { key: "provider", icon: "hand-holding-heart", label: "Service Provider" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setTab(t.key); setError(""); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: "var(--r-pill)", fontWeight: 700, fontSize: "1.35rem", border: "none", cursor: "pointer", transition: "all .2s", background: tab === t.key ? "var(--white)" : "transparent", color: tab === t.key ? "var(--ink-1)" : "var(--ink-3)", boxShadow: tab === t.key ? "0 2px 10px rgba(0,0,0,.1)" : "none" }}
                  >
                    <i className={`fas fa-${t.icon}`} style={{ color: tab === t.key ? "var(--accent)" : "inherit" }} />
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "seller" && user?.roles?.includes("seller") && (
                <div style={{ padding: "24px 20px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "var(--r-lg)", marginBottom: 24, textAlign: "center" }}>
                  <i className="fas fa-store" style={{ fontSize: "2.8rem", color: "#d97706", marginBottom: 12, display: "block" }} />
                  <div style={{ fontWeight: 800, fontSize: "1.8rem", color: "var(--ink-1)", marginBottom: 6 }}>You already have a store</div>
                  <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", margin: "0 0 18px" }}>
                    Each account can only have one store. Go to your Seller Dashboard to manage your existing store.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={() => navigate("/seller-dashboard")}>
                    <i className="fas fa-chart-line" /> Go to My Dashboard
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: tab === "seller" && user?.roles?.includes("seller") ? "none" : undefined }}>
                {tab === "seller"
                  ? <SellerForm seller={seller} setSeller={setSeller} />
                  : <ProviderForm service={service} setService={setService} />
                }

                {error && (
                  <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", color: "#dc2626", borderRadius: "var(--r-md)", fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 10 }}>
                    <i className="fas fa-circle-exclamation" /> {error}
                  </div>
                )}

                <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginTop: 24, borderRadius: "var(--r-pill)" }}>
                  {loading
                    ? <i className="fas fa-spinner fa-spin" />
                    : <><i className="fas fa-paper-plane" /> {tab === "seller" ? "Submit Seller Application" : "Submit Provider Application"} <i className="fas fa-arrow-right" /></>}
                </button>

                <p style={{ textAlign: "center", marginTop: 14, fontSize: "1.2rem", color: "var(--ink-3)" }}>
                  <i className="fas fa-shield-halved" /> UNILAG email required
                </p>
              </form>
            </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ height: 1, flex: 1, background: "var(--line)" }} />
        {title}
        <div style={{ height: 1, flex: 1, background: "var(--line)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: 2 }}>*</span>}
      </div>
      {children}
      {hint && <p style={{ margin: "5px 0 0", fontSize: "1.1rem", color: "var(--ink-3)" }}>{hint}</p>}
    </div>
  );
}

function SellerForm({ seller, setSeller }) {
  const s   = seller;
  const set = (k) => (e) => setSeller({ ...s, [k]: e.target.value });

  const bannerRef = useRef(null);
  const logoRef   = useRef(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [logoPreview,   setLogoPreview]   = useState(null);

  function pickBanner(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBannerPreview(URL.createObjectURL(file));
    setSeller((prev) => ({ ...prev, bannerFile: file }));
  }

  function pickLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setSeller((prev) => ({ ...prev, logoFile: file }));
  }

  return (
    <>
      <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickBanner} />
      <input ref={logoRef}   type="file" accept="image/*" style={{ display: "none" }} onChange={pickLogo} />

      <FormSection title="Store Info">
        <Field label="Store Name" required>
          <input className="input" placeholder="e.g. Tunde Tech Accessories" value={s.storeName} onChange={set("storeName")} required />
        </Field>
        <Field label="Business Name">
          <input className="input" placeholder="Registered business name (if any)" value={s.businessName} onChange={set("businessName")} />
        </Field>
        <Field label="About / Bio">
          <textarea className="textarea" style={{ minHeight: 80 }} placeholder="Tell buyers about yourself and your store…" value={s.bio} onChange={set("bio")} />
        </Field>
      </FormSection>

      <FormSection title="Branding">
        {/* Banner */}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Store Banner Image</div>
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            style={{ width: "100%", height: 120, borderRadius: "var(--r-lg)", border: bannerPreview ? "none" : "2px dashed var(--line)", background: bannerPreview ? "transparent" : "var(--surface)", overflow: "hidden", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {bannerPreview ? (
              <>
                <img src={bannerPreview} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", fontSize: "1.3rem", fontWeight: 600, opacity: 0, transition: "opacity .15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                >
                  <i className="fas fa-pen" /> Change banner
                </div>
              </>
            ) : (
              <>
                <i className="fas fa-image" style={{ fontSize: "2.2rem", color: "var(--ink-4)" }} />
                <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink-2)" }}>
                  {bannerPreview ? "No file chosen" : "Upload store banner"}
                </span>
                <span style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Recommended: 1200 × 400 px</span>
              </>
            )}
          </button>
        </div>

        {/* Logo */}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Store Logo / Avatar</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              style={{ width: 96, height: 96, borderRadius: "var(--r-lg)", border: logoPreview ? "none" : "2px dashed var(--line)", background: logoPreview ? "transparent" : "var(--surface)", overflow: "hidden", cursor: "pointer", position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.2rem", opacity: 0, transition: "opacity .15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    <i className="fas fa-pen" />
                  </div>
                </>
              ) : (
                <i className="fas fa-circle-user" style={{ fontSize: "2.8rem", color: "var(--ink-4)" }} />
              )}
            </button>
            <div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoRef.current?.click()}>
                <i className="fas fa-upload" /> {logoPreview ? "Change logo" : "Upload logo"}
              </button>
              <p style={{ margin: "6px 0 0", fontSize: "1.1rem", color: "var(--ink-3)" }}>PNG or JPG · Square · min 200×200 px</p>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Details">
        <Field label="Product Category" required>
          <select className="select" value={s.category} onChange={set("category")} required>
            <option value="">Select a category</option>
            {SELLER_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Store Description">
          <textarea className="textarea" style={{ minHeight: 90 }} placeholder="Tell buyers what makes your store special — products, pricing, turnaround…" value={s.description} onChange={set("description")} />
        </Field>
        <Field label="Store Location" required>
          <input className="input" placeholder="e.g. Moremi Hall, Faculty of Science block…" value={s.location} onChange={set("location")} required />
        </Field>
      </FormSection>
    </>
  );
}

function ProviderForm({ service, setService }) {
  const s   = service;
  const set = (k) => (e) => setService((prev) => ({ ...prev, [k]: e.target.value }));

  const imageRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);

  function pickImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setService((prev) => ({ ...prev, serviceImageFile: file }));
  }

  return (
    <>
      <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImage} />

      <FormSection title="About You">
        <Field label="Your Name or Business Name">
          <input className="input" placeholder="Full name or business name" value={s.nameOrBusiness} onChange={set("nameOrBusiness")} />
        </Field>
        <Field label="Service Title" required>
          <input className="input" placeholder="e.g. Graphics Design, Tutoring" value={s.title} onChange={set("title")} required />
        </Field>
        <Field label="Service Category" required>
          <select className="select" value={s.category} onChange={set("category")} required>
            <option value="">Select a category</option>
            {SERVICE_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Short Description of Service">
          <input className="input" placeholder="One-line summary of what you offer" value={s.shortDescription} onChange={set("shortDescription")} />
        </Field>
        <Field label="Detailed About You / Your Service">
          <textarea className="textarea" style={{ minHeight: 100 }} placeholder="Describe your background, experience, what clients can expect…" value={s.about} onChange={set("about")} />
        </Field>
      </FormSection>

      <FormSection title="Pricing & Package">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <Field label="Service Rate" required>
            <input className="input" type="number" placeholder="5000" min="0" value={s.rate} onChange={set("rate")} required />
          </Field>
          <div style={{ paddingBottom: 1 }}>
            <div className="label" style={{ marginBottom: 6 }}>Currency</div>
            <select className="select" value={s.currency} onChange={set("currency")} style={{ width: 100 }}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <Field label="Service Package">
          <select className="select" value={s.package} onChange={set("package")}>
            <option value="">Select Package</option>
            {PACKAGES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Duration (in hours or days)">
          <input className="input" placeholder="e.g. 2 hours, 3 days" value={s.duration} onChange={set("duration")} />
        </Field>
      </FormSection>

      <FormSection title="Credentials & Portfolio">
        <Field label="Certifications" hint="Comma-separated">
          <input className="input" placeholder="e.g. Google UX, ACCA, IELTS 7.5" value={s.certifications} onChange={set("certifications")} />
        </Field>
        <Field label="Portfolio (Images or Links)" hint="Comma-separated">
          <input className="input" placeholder="e.g. https://behance.net/you, https://..." value={s.portfolio} onChange={set("portfolio")} />
        </Field>
        <Field label="Policies" hint="Comma-separated">
          <input className="input" placeholder="e.g. No refunds after delivery, 24hr response time" value={s.policies} onChange={set("policies")} />
        </Field>
      </FormSection>

      <FormSection title="Availability">
        <Field label="Time Slots">
          <input className="input" placeholder="e.g. Mon 9am–11am, Wed 2pm–4pm" value={s.timeSlots} onChange={set("timeSlots")} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "var(--ink-1)" }}>Currently Available?</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 2 }}>Clients can book you right now</div>
          </div>
          <label className="partner-toggle">
            <input
              type="checkbox"
              checked={s.isAvailable}
              onChange={(e) => setService((prev) => ({ ...prev, isAvailable: e.target.checked }))}
            />
            <span className="partner-toggle-track" />
          </label>
        </div>
      </FormSection>

      <FormSection title="Media & Tags">
        {/* Service image */}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Upload a Service Image</div>
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            style={{ width: "100%", height: 110, borderRadius: "var(--r-lg)", border: imagePreview ? "none" : "2px dashed var(--line)", background: imagePreview ? "transparent" : "var(--surface)", overflow: "hidden", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="service" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", fontSize: "1.3rem", fontWeight: 600, opacity: 0, transition: "opacity .15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                >
                  <i className="fas fa-pen" /> Change image
                </div>
              </>
            ) : (
              <>
                <i className="fas fa-camera" style={{ fontSize: "2rem", color: "var(--ink-4)" }} />
                <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink-2)" }}>Upload a Service Image</span>
                <span style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>No file chosen</span>
              </>
            )}
          </button>
        </div>
        <Field label="Tags" hint="Comma-separated, e.g. creative, web, design">
          <input className="input" placeholder="e.g. creative, web, design, affordable" value={s.tags} onChange={set("tags")} />
        </Field>
      </FormSection>
    </>
  );
}


