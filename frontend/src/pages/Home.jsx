import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import ProductCard from "../components/ProductCard";
import Skel from "../components/Skel";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import { useAppConfig } from "../context/AppConfigContext";

const SLIDES = [
  {
    img: "/images/market.png",
    tag: "UNILAG · 2,400+ active",
    heading: "Shop Smart.\nBuy Student-to-Student.",
    sub: "Browse thousands of products — textbooks, gadgets, fashion and more — all from verified UNILAG students.",
    cta: "Explore Market", ctaPath: "/market",
    cta2: "Offer a service", cta2Path: "/services",
  },
  {
    img: "/images/service.png",
    tag: "50+ active providers",
    heading: "Skills on Demand,\nRight on Campus.",
    sub: "Hire tutors, designers, photographers and content creators — all verified UNILAG talent.",
    cta: "Browse Services", ctaPath: "/services",
  },
  {
    img: "/images/hostel-hub.png",
    tag: "Near UNILAG",
    heading: "Find Your Perfect\nSpace on Campus.",
    sub: "Affordable rooms and apartments near UNILAG — posted by students, for students.",
    cta: "Find a Room", ctaPath: "/hostel",
  },
  {
    img: "/images/seller.png",
    tag: "Free for students",
    heading: "Turn What You Have\nInto Real Cash.",
    sub: "Sell your books, clothes, gadgets or skills. Completely free for all UNILAG students.",
    cta: "Start Selling", ctaPath: "/partner",
  },
];

const SLUG_ICON = {
  electronics: "laptop", clothing: "shirt", fashion: "shirt",
  books: "book", food: "utensils", hostel: "bed",
  tutoring: "graduation-cap", design: "palette",
  services: "hand-holding-heart", beauty: "spray-can",
  sports: "dumbbell", furniture: "couch",
};

const FALLBACK_CATS = [
  { icon: "laptop", label: "Tech", slug: "electronics" },
  { icon: "shirt", label: "Fashion", slug: "clothing" },
  { icon: "book", label: "Books", slug: "books" },
  { icon: "utensils", label: "Food", slug: "food" },
  { icon: "bed", label: "Hostel", slug: "hostel" },
  { icon: "graduation-cap", label: "Tutors", slug: "tutoring" },
  { icon: "palette", label: "Design", slug: "design" },
];

const FOUNDERS = [
  { name: "Ikechukwu", role: "Chief Executive Officer", about: "Visionary behind UMP — driven by the belief that every UNILAG student deserves a safe, simple way to earn and trade on campus.", avatarUrl: null },
  { name: "Joba", role: "Chief Operating Officer", about: "Keeps UMP running smoothly day-to-day, from onboarding sellers to making sure every transaction is fast, fair, and stress-free.", avatarUrl: null },
  { name: "Oseni Matthew", role: "Fullstack Developer", about: "Focused on Building Web And Mobile Applications that Actually works and Meets Customers Satisfaction.", avatarUrl: null },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const showToast = useToast();
  const { slides: configSlides } = useAppConfig();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cats, setCats] = useState(FALLBACK_CATS);
  const [topSellers, setTopSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [activeCat, setActiveCat] = useState(0);
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef(null);

  const heroSlides = useMemo(() => {
    const active = configSlides?.filter(s => s.on && (s.title || s.image?.url)) || [];
    if (active.length > 0) {
      return active.map(s => ({
        img: s.image?.url || '/images/market.png',
        tag: s.tag || '',
        heading: s.title || '',
        sub: s.subtitle || '',
        cta: s.ctaLabel || 'Learn more',
        ctaPath: s.url || '/',
      }));
    }
    return SLIDES;
  }, [configSlides]);

  function goSlide(idx) {
    setSlide(idx);
    clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000);
  }

  useEffect(() => {
    slideTimer.current = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000);
    return () => clearInterval(slideTimer.current);
  }, [heroSlides.length]);

  function handleBecomeSeller() {
    if (user) {
      navigate("/partner");
    } else {
      showToast("Please sign up to become a partner", "warn");
      setTimeout(() => navigate("/login"), 1600);
    }
  }

  useEffect(() => {
    apiFetch("/api/products?limit=8&sort=newest")
      .then((d) => setProducts(d.products || d || []))
      .catch(() => {})
      .finally(() => setProductsLoading(false));

    apiFetch("/api/categories")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.categories || [];
        if (list.length > 0) {
          setCats(list.slice(0, 7).map((c) => ({
            icon: SLUG_ICON[c.slug] || SLUG_ICON[c.name?.toLowerCase()] || "tag",
            label: c.name,
            slug: c.slug,
          })));
        }
      })
      .catch(() => {});

    apiFetch("/api/sellers")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.sellers || [];
        if (list.length > 0) {
          setTopSellers(list.slice(0, 4).map((s) => ({
            name: s.storeName || s.name,
            role: s.category?.[0] || "Verified Seller",
            rating: s.rating || 0,
            reviews: s.totalOrders || 0,
            avatarUrl: s.avatar?.url || s.logo?.url || null,
            id: s._id,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setSellersLoading(false));
  }, []);

  return (
    <div className="page">
      <Navbar frosted />

      {/* Hero slideshow */}
      <div style={{ position: "relative", margin: "12px 16px 0", borderRadius: "var(--r-2xl)", overflow: "hidden", height: 380 }}>
        {heroSlides.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute", inset: 0,
              opacity: slide === i ? 1 : 0,
              transition: "opacity .6s ease",
              pointerEvents: slide === i ? "auto" : "none",
            }}
          >
            <img
              src={s.img}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.72) 70%)" }} />
            <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24, color: "#fff" }}>
              {s.tag && (
                <span className="chip accent" style={{ alignSelf: "flex-start", marginBottom: 12, fontSize: "1.1rem" }}>
                  <i className="fas fa-bolt" /> {s.tag}
                </span>
              )}
              <h1 style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1, whiteSpace: "pre-line" }}>
                {s.heading}
              </h1>
              <p style={{ fontSize: "1.35rem", opacity: 0.88, marginTop: 12, marginBottom: 18, maxWidth: 300 }}>
                {s.sub}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => navigate(s.ctaPath)}>
                  {s.cta} <i className="fas fa-arrow-right" />
                </button>
                {s.cta2 && (
                  <button className="btn" style={{ background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(10px)" }} onClick={() => navigate(s.cta2Path)}>
                    {s.cta2}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Dot indicators */}
        <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => goSlide(i)}
              style={{
                width: slide === i ? 20 : 6, height: 6,
                borderRadius: 3, border: "none", cursor: "pointer", padding: 0,
                background: slide === i ? "#fff" : "rgba(255,255,255,.45)",
                transition: "width .3s, background .3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="section-title"><h2>Browse by category</h2></div>
      <div className="cat-row">
        {cats.map((c, i) => (
          <div key={c.slug} className={`cat-pill${activeCat === i ? " active" : ""}`} onClick={() => { setActiveCat(i); navigate(`/market?category=${c.slug}`); }}>
            <div className="ico"><i className={`fas fa-${c.icon}`} /></div>
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Promo banners */}
      <div style={{ margin: "24px 16px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
          {[
            { bg: "linear-gradient(135deg,#ea580c,#7c2d12)", icon: "tag", t: "Student Exclusive Deals", s: "Discounts on services & products every week", cta: "Explore", path: "/market" },
            { bg: "linear-gradient(135deg,#92400e,#78350f)", icon: "crown", t: "Subscribe your store", s: "Get the crown badge and stand out to buyers", cta: "Learn more", path: "/partner" },
          ].map((b, i) => (
            <div key={i} style={{ minWidth: "85%", borderRadius: "var(--r-xl)", padding: 22, color: "#fff", background: b.bg, flexShrink: 0 }}>
              <span className="chip" style={{ background: "rgba(255,255,255,.18)", color: "#fff", marginBottom: 10 }}>
                <i className={`fas fa-${b.icon}`} /> Featured
              </span>
              <h3 style={{ margin: "8px 0 4px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{b.t}</h3>
              <p style={{ margin: 0, opacity: 0.85, fontSize: "1.3rem" }}>{b.s}</p>
              <button className="btn btn-sm" style={{ background: "#fff", color: "#0f172a", marginTop: 12 }} onClick={() => navigate(b.path)}>
                {b.cta} <i className="fas fa-arrow-right" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advertise with us banner */}
      <div
        style={{ margin: "20px 16px 0", padding: "18px 20px", borderRadius: "var(--r-xl)", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", color: "#fff", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
        onClick={() => navigate("/messages?advertise=1")}
      >
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(249,115,22,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="fas fa-bullhorn" style={{ fontSize: "2rem", color: "var(--accent)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Advertise on UMP</div>
          <div style={{ fontSize: "1.2rem", opacity: 0.75, marginTop: 2 }}>Reach 5,000+ UNILAG students — contact us to place an ad</div>
        </div>
        <i className="fas fa-arrow-right" style={{ opacity: 0.6, flexShrink: 0 }} />
      </div>

      {/* Trending products */}
      <div className="section-title">
        <h2>Trending now <i className="fas fa-fire" style={{ color: "var(--accent)" }} /></h2>
        <span className="more" onClick={() => navigate("/market")} style={{ cursor: "pointer" }}>See all</span>
      </div>
      <div className="h-scroll">
        {productsLoading
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: 160, flexShrink: 0 }}><Skel.ProductCard /></div>
            ))
          : products.map((p) => (
              <div key={p._id} style={{ width: 160, flexShrink: 0 }}>
                <ProductCard product={p} variant="always" onAddToCart={() => {}} />
              </div>
            ))
        }
      </div>

      {/* What we do */}
      <div className="section-title"><h2><i className="fas fa-lightbulb" style={{ color: "var(--accent)", marginRight: 8 }} />What we do</h2></div>
      <p style={{ padding: "0 16px 12px", margin: 0, fontSize: "1.35rem", color: "var(--ink-2)" }}>
        We connect students across campuses, making buying and selling easier, safer, and more fun.
      </p>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { i: "store", t: "Campus Marketplace", s: "A one-stop platform for students to sell, buy, and discover products and services.", c: "var(--accent)" },
          { i: "users", t: "Community First", s: "We focus on student creators, ensuring a safe, student-driven environment.", c: "#2563eb" },
          { i: "bolt", t: "Fast & Reliable", s: "Quick connections with fellow students using smart search and instant messaging.", c: "#16a34a" },
        ].map((f) => (
          <div key={f.t} className="card" style={{ padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${f.c}1a`, color: f.c, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>
              <i className={`fas fa-${f.i}`} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 700 }}>{f.t}</h3>
              <p style={{ margin: 0, fontSize: "1.3rem", color: "var(--ink-2)" }}>{f.s}</p>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="section-title" style={{ marginTop: 8 }}>
        <h2><i className="fas fa-gear" style={{ color: "var(--accent)", marginRight: 8 }} />How it works</h2>
      </div>
      <p style={{ padding: "0 16px 16px", margin: 0, fontSize: "1.35rem", color: "var(--ink-2)" }}>
        Getting started on UMP is simple and seamless.
      </p>
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { n: 1, icon: "user-plus",       t: "Sign Up",       s: "Create your free student account in seconds.", color: "#f97316" },
          { n: 2, icon: "magnifying-glass", t: "Post or Browse", s: "List products or explore what's available.",  color: "#2563eb" },
          { n: 3, icon: "comment-dots",    t: "Connect",       s: "Chat directly and negotiate the deal.",        color: "#7c3aed" },
          { n: 4, icon: "handshake",       t: "Meet & Trade",  s: "Close the deal in a safe campus-friendly way.", color: "#16a34a" },
        ].map((step) => (
          <div key={step.n} className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 10, right: 12, fontWeight: 900, fontSize: "3.6rem", color: "var(--line)", lineHeight: 1, userSelect: "none" }}>{step.n}</div>
            <div style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", background: `${step.color}18`, color: step.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: 12 }}>
              <i className={`fas fa-${step.icon}`} />
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem", marginBottom: 4 }}>{step.t}</div>
            <div style={{ fontSize: "1.25rem", color: "var(--ink-2)", lineHeight: 1.5 }}>{step.s}</div>
          </div>
        ))}
      </div>

      {/* Top creators on campus — founders always shown first, backend sellers appended */}
      <div className="section-title">
        <h2>Top creators on campus</h2>
        <span className="more" onClick={() => navigate("/store")} style={{ cursor: "pointer" }}>See all</span>
      </div>
      <div className="h-scroll">
        {/* Skeleton while sellers load */}
        {sellersLoading && [1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ width: 180, flexShrink: 0, padding: 16, textAlign: "center" }}>
            <Skel.Circle size={64} style={{ margin: "4px auto 10px", borderRadius: "50%" }} />
            <Skel.Line w="70%" style={{ margin: "0 auto 6px" }} />
            <Skel.Line w="50%" h={11} style={{ margin: "0 auto 8px" }} />
            <Skel w="100%" h={30} r={20} style={{ marginTop: 10 }} />
          </div>
        ))}

        {/* Founders */}
        {FOUNDERS.map((f, idx) => (
          <div key={f.name} className="card" style={{ width: 200, flexShrink: 0, padding: 16, textAlign: "center" }}>
            <div style={{ position: "relative", width: 64, height: 64, margin: "4px auto 10px" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid var(--accent)" }}>
                {f.avatarUrl
                  ? <img src={f.avatarUrl} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Ph kind={`portrait-${idx + 1}`} label={f.name.split(" ")[0]} />}
              </div>
              <span style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "#fff", fontSize: ".9rem", fontWeight: 700, padding: "1px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>
                Founder
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", marginTop: 6 }}>{f.name}</div>
            <div style={{ fontSize: "1.15rem", color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>{f.role}</div>
            <p style={{ margin: "8px 0 0", fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textAlign: "left" }}>
              {f.about}
            </p>
          </div>
        ))}

        {/* Backend sellers */}
        {topSellers.map((s) => (
          <div key={s.id} className="card" style={{ width: 180, flexShrink: 0, padding: 16, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", margin: "4px auto 10px", border: "2px solid var(--line)" }}>
              {s.avatarUrl
                ? <img src={s.avatarUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Ph kind="portrait-1" label={s.name?.split(" ")[0]} />}
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{s.name}</div>
            <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>{s.role}</div>
            {s.rating > 0 && (
              <div className="rating" style={{ justifyContent: "center", marginTop: 6 }}>
                <i className="fas fa-star star" /> {s.rating.toFixed(1)} <span className="count">({s.reviews})</span>
              </div>
            )}
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 10, width: "100%" }} onClick={() => navigate(`/store/${s.id}`)}>Visit store</button>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ margin: "32px 16px", padding: 28, borderRadius: "var(--r-2xl)", background: "linear-gradient(135deg, var(--navy-800), #1e1b4b)", color: "#fff", textAlign: "center" }}>
        <h2 style={{ fontSize: "2.4rem", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Sell what you've got</h2>
        <p style={{ margin: "0 0 18px", opacity: 0.8 }}>Turn your skills, books or old phone into cash. Free for students.</p>
        <button className="btn btn-primary" onClick={handleBecomeSeller}>Become a seller <i className="fas fa-arrow-right" /></button>
      </div>

      <Footer />
      <BottomNav />
    </div>
  );
}
