import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const SELLER_PERKS = [
  { icon: "crown",            text: "Gold crown badge — visible on your store and every product listing" },
  { icon: "arrow-up-right-dots", text: "Priority placement in search results and the Store directory" },
  { icon: "chart-line",       text: "Advanced analytics — revenue trends, top products, buyer insights" },
  { icon: "infinity",         text: "Unlimited product listings (free accounts capped at 20)" },
  { icon: "headset",          text: "Priority customer support — responses within 2 hours" },
  { icon: "shield-halved",    text: "Verified seller trust badge for increased buyer confidence" },
];

const PROVIDER_PERKS = [
  { icon: "certificate",      text: "Verified badge — prominently shown on your service listings" },
  { icon: "arrow-up-right-dots", text: "Priority ranking in service search and category pages" },
  { icon: "calendar-check",   text: "Advanced booking analytics — peak hours, conversion rate, earnings" },
  { icon: "infinity",         text: "Unlimited service listings (free accounts capped at 3)" },
  { icon: "headset",          text: "Priority support for disputes and booking issues" },
  { icon: "users",            text: "Featured in UMP's 'Top Providers' curated list" },
];

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: 3000,
    period: "/month",
    badge: null,
    desc: "Cancel any time. Renews monthly.",
  },
  {
    id: "annual",
    label: "Annual",
    price: 25000,
    period: "/year",
    badge: "Save 31%",
    desc: "Pay once, subscribed for a full year.",
  },
];

export default function SubscribePage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { user }      = useUser();
  const showToast     = useToast();
  const type          = params.get("type") || "seller"; // "seller" | "provider"
  const isSeller      = type === "seller";

  const perks         = isSeller ? SELLER_PERKS : PROVIDER_PERKS;
  const title         = isSeller ? "Subscribe your store" : "Subscribe your provider account";
  const subtitle      = isSeller
    ? "Stand out to thousands of UNILAG buyers with the UMP crown badge."
    : "Build client trust and get more bookings with the verified badge.";

  const [selected, setSelected] = useState("annual");
  const [requesting, setRequesting]  = useState(false);
  const [requested, setRequested]    = useState(
    isSeller ? !!user?.sellerSubscriptionRequested : !!user?.providerSubscriptionRequested
  );

  async function handleSubscribe() {
    if (!user) { navigate("/login"); return; }
    setRequesting(true);
    try {
      const endpoint = isSeller
        ? "/api/sellers/request-verification"
        : "/api/services/request-verification";
      await apiFetch(endpoint, { method: "POST", body: { plan: selected } });
      setRequested(true);
      showToast("Subscription request sent! Our team will activate it shortly.", "success");
    } catch (err) {
      showToast(err?.message || "Failed to submit request. Please try again.", "error");
    } finally {
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
        {requested ? (
          <div style={{ padding: "18px 20px", borderRadius: "var(--r-lg)", background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", display: "flex", alignItems: "center", gap: 14 }}>
            <i className="fas fa-clock" style={{ fontSize: "1.8rem", color: "#3b82f6", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1d4ed8" }}>Subscription request received</div>
              <div style={{ fontSize: "1.3rem", color: "var(--ink-3)", marginTop: 4 }}>
                Our team will review and activate your subscription within 24 hours. You'll receive a notification once it's live.
              </div>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", borderRadius: "var(--r-pill)", fontSize: "1.5rem" }}
            disabled={requesting}
            onClick={handleSubscribe}
          >
            {requesting
              ? <><i className="fas fa-spinner fa-spin" /> Processing…</>
              : <><i className={`fas fa-${isSeller ? "crown" : "certificate"}`} /> Subscribe — ₦{plan?.price.toLocaleString()}{plan?.period}</>}
          </button>
        )}

        <p style={{ textAlign: "center", fontSize: "1.2rem", color: "var(--ink-4)", marginTop: 16 }}>
          Questions? <button onClick={() => navigate("/messages?advertise=1")} style={{ border: "none", background: "none", color: "var(--accent)", cursor: "pointer", fontSize: "inherit", textDecoration: "underline" }}>Contact our team</button>
        </p>
      </div>

      <Footer />
    </div>
  );
}
