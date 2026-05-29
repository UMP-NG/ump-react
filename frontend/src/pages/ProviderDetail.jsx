import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import Skel from "../components/Skel";

const PRICING_LABEL = {
  fixed:        (r, cur) => `${cur === "USD" ? "$" : "₦"}${Number(r).toLocaleString()}`,
  hourly:       (r, cur) => `${cur === "USD" ? "$" : "₦"}${Number(r).toLocaleString()}/hr`,
  per_project:  (r, cur) => `${cur === "USD" ? "$" : "₦"}${Number(r).toLocaleString()} / project`,
  starting_from:(r, cur) => `From ${cur === "USD" ? "$" : "₦"}${Number(r).toLocaleString()}`,
  negotiable:   () => "Negotiable",
  free:         () => "Free",
};

function formatPrice(service) {
  const fn = PRICING_LABEL[service.pricingType] || PRICING_LABEL.fixed;
  return fn(service.rate || 0, service.currency || "NGN");
}

export default function ProviderDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiFetch(`/api/services/providers/${id}`)
      .then((d) => {
        setProvider(d.provider);
        setServices(d.services || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page">
      <Navbar />
      <div style={{ padding: "32px 16px" }}>
        <Skel w={72} h={72} r="50%" style={{ marginBottom: 12 }} />
        <Skel w="50%" h={22} r={6} style={{ marginBottom: 8 }} />
        <Skel w="70%" h={14} r={4} />
      </div>
    </div>
  );

  if (!provider) return (
    <div className="page">
      <Navbar />
      <div style={{ padding: "80px 16px", textAlign: "center" }}>
        <i className="fas fa-user-slash" style={{ fontSize: "3rem", color: "var(--ink-3)" }} />
        <p style={{ marginTop: 12, color: "var(--ink-2)", fontSize: "1.4rem" }}>Provider not found</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate("/providers")}>Back to providers</button>
      </div>
    </div>
  );

  const avatarUrl    = provider.avatar?.url || (typeof provider.avatar === "string" ? provider.avatar : null);
  const displayName  = provider.businessName || provider.name || "Provider";
  const avgRating    = services.length
    ? Math.round((services.reduce((s, sv) => s + (sv.rating || 0), 0) / services.length) * 10) / 10
    : 0;

  return (
    <div className="page">
      <Navbar />

      {/* Profile header */}
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", flexShrink: 0, background: "var(--surface)", position: "relative" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <Ph kind="portrait-3" label={displayName[0]} />}
            {provider.verified && (
              <span style={{ position: "absolute", bottom: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "#f59e0b", border: "2px solid var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="fas fa-crown" style={{ fontSize: "0.7rem", color: "#fff" }} />
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 2px", letterSpacing: "-0.02em" }}>{displayName}</h1>
            {provider.headline && (
              <p style={{ margin: "0 0 6px", fontSize: "1.3rem", color: "var(--ink-2)" }}>{provider.headline}</p>
            )}
            {provider.categories?.length > 0 && (
              <p style={{ margin: 0, fontSize: "1.2rem", color: "var(--accent)" }}>{provider.categories.join(" · ")}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 20, paddingBottom: 16, borderBottom: "1px solid var(--line)", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{services.length}</div>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Services</div>
          </div>
          {avgRating > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{avgRating}</div>
              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Rating</div>
            </div>
          )}
          {provider.yearsExperience > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.6rem" }}>{provider.yearsExperience}</div>
              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Yrs exp.</div>
            </div>
          )}
        </div>

        {/* Bio */}
        {provider.bio && (
          <p style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 14px" }}>{provider.bio}</p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, fontSize: "1.2rem", color: "var(--ink-3)" }}>
          {provider.location && (
            <span><i className="fas fa-location-dot" style={{ color: "var(--accent)", marginRight: 5 }} />{provider.location}</span>
          )}
          {provider.portfolioUrl && (
            <a href={provider.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
              <i className="fas fa-link" style={{ marginRight: 5 }} />Portfolio
            </a>
          )}
          {provider.instagram && (
            <a href={`https://instagram.com/${provider.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={{ color: "#e1306c", textDecoration: "none" }}>
              <i className="fab fa-instagram" style={{ marginRight: 5 }} />{provider.instagram}
            </a>
          )}
          {provider.twitter && (
            <a href={`https://twitter.com/${provider.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{ color: "#1da1f2", textDecoration: "none" }}>
              <i className="fab fa-twitter" style={{ marginRight: 5 }} />{provider.twitter}
            </a>
          )}
        </div>

        {/* Message / WhatsApp */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => navigate(`/messages?with=${id}&name=${encodeURIComponent(displayName)}`)}
          >
            <i className="fas fa-comment" /> Message
          </button>
          {provider.whatsapp && (
            <a
              href={`https://wa.me/${provider.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <i className="fab fa-whatsapp" style={{ color: "#22c55e" }} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Services */}
      <div style={{ padding: "0 16px 32px" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 14px" }}>
          Services <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "1.4rem" }}>({services.length})</span>
        </h2>

        {services.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)", fontSize: "1.4rem" }}>
            No services listed yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {services.map((sv) => {
              const imgUrl = sv.images?.[0]?.url || null;
              return (
                <div
                  key={sv._id}
                  className="card"
                  style={{ padding: 14, display: "flex", gap: 12, cursor: "pointer" }}
                  onClick={() => navigate(`/services/${sv._id}`)}
                >
                  <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={sv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Ph kind={sv.major?.toLowerCase() || "default"} label={sv.major || ""} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.3 }}>{sv.title || sv.name}</div>
                      {sv.available === false && (
                        <span style={{ fontSize: "1rem", padding: "2px 7px", borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 600, flexShrink: 0 }}>Unavailable</span>
                      )}
                    </div>
                    {sv.desc && (
                      <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {sv.desc}
                      </div>
                    )}
                    {(sv.rating || 0) > 0 && (
                      <div className="rating" style={{ marginTop: 4 }}>
                        <i className="fas fa-star star" /> {sv.rating}
                        <span className="count">({sv.reviewsCount || 0})</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>
                        {formatPrice(sv)}
                      </span>
                      <button
                        className="btn btn-sm btn-dark"
                        onClick={(e) => { e.stopPropagation(); navigate(`/services/${sv._id}`); }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
