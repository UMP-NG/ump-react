import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";

const FAQS = [
  {
    q: "How do I create an account?",
    a: "Tap 'Sign up' on the login screen, enter your UNILAG school email (matric number @live.unilag.edu.ng), choose a password, then verify with the 6-digit OTP sent to your email.",
  },
  {
    q: "I didn't receive my OTP — what do I do?",
    a: "Check your spam/junk folder first. If it's not there, tap 'Resend OTP' on the verification screen. OTPs expire after 10 minutes. If you still don't receive it, contact support.",
  },
  {
    q: "How do I become a seller?",
    a: "Go to your profile, tap 'Become a seller / provider', fill in your store details, and submit. Your store is created immediately — no waiting period.",
  },
  {
    q: "How do I list a product?",
    a: "From your Seller Dashboard, tap 'Add product', fill in the name, price, photos and category, then publish. Your product is live on the marketplace instantly.",
  },
  {
    q: "How do buyers pay?",
    a: "Buyers can pay via card, bank transfer, or USSD through our integrated payment gateway. Funds are held securely and released once the order is confirmed.",
  },
  {
    q: "How do I get verified?",
    a: "From your Seller Dashboard or Provider Analytics page, tap 'Get Verified'. The UMP team reviews your profile and notifies you once approved. A verified badge increases buyer trust significantly.",
  },
  {
    q: "Can I cancel an order?",
    a: "Buyers can cancel a pending order from the 'My Orders' page before the seller confirms it. Once confirmed, contact the seller directly via the in-app chat.",
  },
  {
    q: "What do I do if I have a dispute with a buyer/seller?",
    a: "Use the in-app messaging to resolve it first. If unresolved, contact UMP support via WhatsApp or email with your order ID — we'll mediate.",
  },
  {
    q: "Is UMP free to use?",
    a: "Yes — creating an account, listing products, and browsing are completely free for UNILAG students. A small service fee applies on completed transactions.",
  },
];

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 600, flex: 1 }}>{q}</div>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ color: "var(--ink-3)", flexShrink: 0, transition: "transform .2s" }} />
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px", fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

const CONTACT = [
  {
    icon: "brands fa-whatsapp",
    label: "WhatsApp Support",
    sub: "Fastest response — Mon–Sat, 8am–8pm",
    color: "#25d366",
    bg: "rgba(37,211,102,.1)",
    action: () => window.open("https://wa.me/2348000000000?text=Hi%20UMP%20Support", "_blank"),
  },
  {
    icon: "envelope",
    label: "Email Support",
    sub: "admin@myump.com.ng",
    color: "#3b82f6",
    bg: "rgba(59,130,246,.1)",
    action: () => window.open("mailto:admin@myump.com.ng"),
  },
  {
    icon: "brands fa-instagram",
    label: "Instagram",
    sub: "@ump.ng — DMs open",
    color: "#e1306c",
    bg: "rgba(225,48,108,.1)",
    action: () => window.open("https://instagram.com/ump.ng", "_blank"),
  },
  {
    icon: "brands fa-x-twitter",
    label: "X (Twitter)",
    sub: "@ump_ng",
    color: "#000",
    bg: "rgba(0,0,0,.07)",
    action: () => window.open("https://twitter.com/ump_ng", "_blank"),
  },
];

const TICKET_CATEGORIES = ["Order issue", "Payment problem", "Account issue", "Bug report", "Seller dispute", "Other"];

export default function HelpSupport() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [ticket, setTicket] = useState({ category: "", subject: "", message: "" });
  const [ticketSent, setTicketSent] = useState(false);

  function submitTicket(e) {
    e.preventDefault();
    if (!ticket.subject.trim() || !ticket.message.trim()) return;
    const body = `Category: ${ticket.category || "Other"}\n\nSubject: ${ticket.subject}\n\n${ticket.message}`;
    window.open(
      `mailto:admin@myump.com.ng?subject=${encodeURIComponent(`[Support] ${ticket.subject}`)}&body=${encodeURIComponent(body)}`,
      "_blank"
    );
    setTicketSent(true);
    setTicket({ category: "", subject: "", message: "" });
  }

  const filtered = search.trim()
    ? FAQS.filter((f) =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQS;

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left" /></button>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Help & Support</h1>
      </div>

      {/* Search FAQs */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <i className="fas fa-magnifying-glass" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", fontSize: "1.4rem" }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs…"
            style={{ paddingLeft: 42 }}
          />
        </div>
      </div>

      {/* Contact channels */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>Contact us</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CONTACT.map((c) => (
            <button
              key={c.label}
              onClick={c.action}
              style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: c.bg, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`fa-${c.icon}`} style={{ fontSize: "1.6rem", color: c.color }} />
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--ink-1)" }}>{c.label}</div>
              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{c.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>Frequently asked questions</div>
        {search && (
          <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 8 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </div>
        )}
      </div>
      <div className="card" style={{ margin: "8px 16px 0", overflow: "hidden", padding: 0 }}>
        {filtered.length > 0
          ? filtered.map((f) => <FAQ key={f.q} q={f.q} a={f.a} />)
          : (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ink-3)" }}>
              <i className="fas fa-face-sad-tear" style={{ fontSize: "2.4rem", marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: "1.3rem" }}>No results found — try different keywords or contact us above.</p>
            </div>
          )}
      </div>

      {/* Support ticket form */}
      <div style={{ margin: "24px 16px 0", padding: "20px", borderRadius: "var(--r-xl)", background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fas fa-headset" style={{ fontSize: "1.6rem", color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>Submit a support ticket</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>We'll respond within 24 hours</div>
          </div>
        </div>
        {ticketSent ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <i className="fas fa-circle-check" style={{ fontSize: "2.8rem", color: "#16a34a", marginBottom: 10 }} />
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#16a34a" }}>Ticket submitted!</div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 4 }}>Your email client should have opened. We'll get back to you soon.</div>
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 12 }} onClick={() => setTicketSent(false)}>Submit another</button>
          </div>
        ) : (
          <form onSubmit={submitTicket}>
            <select
              className="input"
              value={ticket.category}
              onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
              style={{ marginBottom: 10 }}
            >
              <option value="">Select category</option>
              {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              className="input"
              placeholder="Subject *"
              value={ticket.subject}
              onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
              required
              style={{ marginBottom: 10 }}
            />
            <textarea
              className="input"
              placeholder="Describe your issue in detail… *"
              value={ticket.message}
              onChange={(e) => setTicket({ ...ticket, message: e.target.value })}
              rows={4}
              required
              style={{ width: "100%", resize: "none", marginBottom: 12 }}
            />
            <button className="btn btn-primary btn-block" type="submit">
              <i className="fas fa-paper-plane" /> Send Ticket
            </button>
          </form>
        )}
      </div>

      <div style={{ padding: "20px 16px 80px", textAlign: "center", color: "var(--ink-4)", fontSize: "1.2rem" }}>
        UMP v1.0 · Built for UNILAG students
      </div>

      <BottomNav />
    </div>
  );
}
