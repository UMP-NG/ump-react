import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useAppConfig } from "../context/AppConfigContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const SELLER_PERKS = [
  { icon: "crown",               text: "Gold crown badge — visible on your store and every product listing" },
  { icon: "arrow-up-right-dots", text: "Priority placement in search results and the Store directory" },
  { icon: "chart-line",          text: "Advanced analytics — revenue trends, top products, buyer insights" },
  { icon: "infinity",            text: "Unlimited product listings (free accounts capped at 20)" },
  { icon: "headset",             text: "Priority customer support — responses within 2 hours" },
  { icon: "shield-halved",       text: "Verified seller trust badge for increased buyer confidence" },
];

const PROVIDER_PERKS = [
  { icon: "certificate",         text: "Verified badge — prominently shown on your service listings" },
  { icon: "arrow-up-right-dots", text: "Priority ranking in service search and category pages" },
  { icon: "calendar-check",      text: "Advanced booking analytics — peak hours, conversion rate, earnings" },
  { icon: "infinity",            text: "Unlimited service listings (free accounts capped at 3)" },
  { icon: "headset",             text: "Priority support for disputes and booking issues" },
  { icon: "users",               text: "Featured in UMP's 'Top Providers' curated list" },
];

// Mini store card — mirrors the card in the Hustle page stores grid
function StorePreviewCard({ storeName, logoUrl, bannerUrl }) {
  const name = storeName || "Your Store";
  return (
    <div className="card" style={{ overflow: "hidden", width: 180, flexShrink: 0 }}>
      {/* Banner */}
      <div style={{ height: 70, background: "var(--surface)", position: "relative" }}>
        {bannerUrl
          ? <img src={bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,var(--accent),#ea580c)" }} />}
        {/* Logo circle */}
        <div style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "3px solid var(--paper)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {logoUrl
            ? <img src={logoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{name[0].toUpperCase()}</span>}
        </div>
      </div>
      <div style={{ padding: "26px 12px 14px", textAlign: "center" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "1rem", color: "#f59e0b", marginTop: 4 }}>
          <i className="fas fa-crown" style={{ fontSize: "0.85rem" }} /> Subscribed
        </div>
        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>
          <i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 3 }} />5.0
        </div>
      </div>
    </div>
  );
}

// Mini provider card — mirrors the card in the Hustle page providers grid
function ProviderPreviewCard({ name, avatarUrl }) {
  const displayName = name || "Your Profile";
  return (
    <div className="card" style={{ padding: 16, width: 160, flexShrink: 0, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", margin: "0 auto 10px", background: "var(--surface)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {avatarUrl
          ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{displayName[0].toUpperCase()}</span>}
        {/* Verified badge */}
        <span style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: "50%", background: "#f59e0b", border: "2px solid var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="fas fa-crown" style={{ fontSize: "0.65rem", color: "#fff" }} />
        </span>
      </div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>Design · Tech</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8, fontSize: "1.15rem", color: "var(--ink-3)" }}>
        <span><i className="fas fa-briefcase" style={{ marginRight: 3 }} />4</span>
        <span><i className="fas fa-star" style={{ color: "#f59e0b", marginRight: 3 }} />4.9</span>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const navigate          = useNavigate();
  const [params]          = useSearchParams();
  const { user }          = useUser();
  const showToast         = useToast();
  const { subscriptions } = useAppConfig();
  const type              = params.get("type") || "seller";
  const isSeller          = type === "seller";

  const subConfig = isSeller ? subscriptions.seller : subscriptions.provider;
  const PLANS = [
    {
      id:     "monthly",
      label:  subConfig.monthly.label,
      price:  subConfig.monthly.price,
      period: "/month",
      badge:  null,
      desc:   "Cancel any time. Renews monthly.",
    },
    {
      id:     "annual",
      label:  subConfig.annual.label,
      price:  subConfig.annual.price,
      period: "/year",
      badge:  subConfig.annual.badge || null,
      desc:   "Pay once, subscribed for a full year.",
    },
  ];

  const perks    = isSeller ? SELLER_PERKS : PROVIDER_PERKS;
  const title    = isSeller ? "Subscribe your store" : "Subscribe your provider account";
  const subtitle = isSeller
    ? "Stand out to thousands of UNILAG buyers with the UMP crown badge."
    : "Build client trust and get more bookings with the verified badge.";

  const [selected, setSelected]     = useState("annual");
  const [requesting, setRequesting] = useState(false);

  // Fetch profile data for the live preview
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [storeName, setStoreName]   = useState("");
  const [logoUrl, setLogoUrl]       = useState("");
  const [bannerUrl, setBannerUrl]   = useState("");
  const [avatarUrl, setAvatarUrl]   = useState("");

  useEffect(() => {
    if (!user) return;
    if (isSeller) {
      apiFetch("/api/sellers/me")
        .then((d) => {
          const s = d?.seller;
          setStoreName(s?.storeName || user.name || "");
          setLogoUrl(s?.logo?.url || "");
          setBannerUrl(s?.banner?.url || "");
          setProfileLoaded(true);
        })
        .catch(() => { setStoreName(user.name || ""); setProfileLoaded(true); });
    } else {
      // Provider — user object carries avatar
      setAvatarUrl(user.avatar?.url || user.avatar || "");
      setStoreName(user.name || "");
      setProfileLoaded(true);
    }
  }, [user, isSeller]);

  async function handleSubscribe() {
    if (!user) { navigate("/login"); return; }
    setRequesting(true);
    try {
      const res = await apiFetch("/api/payments/subscription/initialize", {
        method: "POST",
        body: { plan: selected, type: isSeller ? "seller" : "provider" },
      });
      const url = res.payment_link;
      if (!url || !url.startsWith("https://")) {
        throw new Error("Invalid payment URL received. Please try again.");
      }
      window.location.href = url;
    } catch (err) {
      showToast(err?.message || "Failed to start payment. Please try again.", "error");
      setRequesting(false);
    }
  }

  const plan = PLANS.find((p) => p.id === selected);

  return (
    <div className="page">
      <Navbar />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* Back */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 24 }}
          onClick={() => navigate(-1)}
        >
          <i className="fas fa-arrow-left" /> Back
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <i className={`fas fa-${isSeller ? "crown" : "certificate"}`} style={{ fontSize: "2rem", color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{title}</h1>
          <p style={{ fontSize: "1.5rem", color: "var(--ink-2)", margin: 0 }}>{subtitle}</p>
        </div>

        {/* Live preview — what your store/profile looks like after subscribing */}
        {profileLoaded && (
          <div className="card" style={{ padding: 20, marginBottom: 24, background: "linear-gradient(135deg,rgba(245,158,11,.06),rgba(217,119,6,.04))", border: "1.5px solid rgba(245,158,11,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="fas fa-eye" style={{ color: "#d97706", fontSize: "1.2rem" }} />
              <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>Preview — how you'll appear after subscribing</span>
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
              {isSeller ? (
                <>
                  <StorePreviewCard storeName={storeName} logoUrl={logoUrl} bannerUrl={bannerUrl} />
                  {/* Second card showing where the crown appears in search */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 180 }}>
                    <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--paper)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{storeName || "Your Store"}</div>
                      <div style={{ color: "#f59e0b", fontSize: "1.05rem" }}>
                        <i className="fas fa-crown" style={{ marginRight: 4, fontSize: "0.85rem" }} />Subscribed seller
                      </div>
                      <div style={{ color: "var(--ink-3)", fontSize: "1.05rem", marginTop: 2 }}>Appears at top of search results</div>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--paper)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                      <div style={{ color: "var(--ink-2)", fontSize: "1.1rem", marginBottom: 4 }}>Product listing badge</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,.12)", color: "#b45309", fontWeight: 700, fontSize: "1.05rem" }}>
                        <i className="fas fa-crown" style={{ fontSize: "0.8rem" }} /> Subscribed
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ProviderPreviewCard name={storeName} avatarUrl={avatarUrl} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 180 }}>
                    <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--paper)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{storeName || "Your Profile"}</div>
                      <div style={{ color: "#f59e0b", fontSize: "1.05rem" }}>
                        <i className="fas fa-certificate" style={{ marginRight: 4, fontSize: "0.85rem" }} />Verified provider
                      </div>
                      <div style={{ color: "var(--ink-3)", fontSize: "1.05rem", marginTop: 2 }}>Ranked higher in service search</div>
                    </div>
                    <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--paper)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                      <div style={{ color: "var(--ink-2)", fontSize: "1.1rem", marginBottom: 4 }}>Service listing badge</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,.12)", color: "#b45309", fontWeight: 700, fontSize: "1.05rem" }}>
                        <i className="fas fa-certificate" style={{ fontSize: "0.8rem" }} /> Verified
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Perks */}
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 16px" }}>What you get</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {perks.map((p) => (
              <div key={p.icon} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245,158,11,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fas fa-${p.icon}`} style={{ color: "#d97706", fontSize: "1.2rem" }} />
                </div>
                <p style={{ margin: 0, fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plan selector */}
        <h2 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 14px" }}>Choose a plan</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              style={{
                padding: "18px 16px", borderRadius: "var(--r-lg)", textAlign: "left", cursor: "pointer",
                border: `2px solid ${selected === p.id ? "var(--accent)" : "var(--line)"}`,
                background: selected === p.id ? "rgba(249,115,22,.05)" : "var(--paper)",
                transition: "border-color .15s",
                position: "relative",
              }}
            >
              {p.badge && (
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: "1rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>
                  {p.badge}
                </span>
              )}
              <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--accent)" }}>
                ₦{p.price.toLocaleString()}
                <span style={{ fontSize: "1.2rem", fontWeight: 400, color: "var(--ink-3)" }}>{p.period}</span>
              </div>
              <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 6 }}>{p.desc}</div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%", borderRadius: "var(--r-pill)", fontSize: "1.5rem" }}
          disabled={requesting}
          onClick={handleSubscribe}
        >
          {requesting
            ? <><i className="fas fa-spinner fa-spin" /> Redirecting to payment…</>
            : <><i className={`fas fa-${isSeller ? "crown" : "certificate"}`} /> Pay ₦{plan?.price.toLocaleString()}{plan?.period} — Activate now</>}
        </button>

        <p style={{ textAlign: "center", fontSize: "1.15rem", color: "var(--ink-4)", marginTop: 10 }}>
          <i className="fas fa-lock" style={{ marginRight: 5 }} />
          Secured by Flutterwave · Instant activation after payment
        </p>

        <p style={{ textAlign: "center", fontSize: "1.2rem", color: "var(--ink-4)", marginTop: 16 }}>
          Questions? <button onClick={() => navigate("/messages?advertise=1")} style={{ border: "none", background: "none", color: "var(--accent)", cursor: "pointer", fontSize: "inherit", textDecoration: "underline" }}>Contact our team</button>
        </p>
      </div>

      <Footer />
    </div>
  );
}
