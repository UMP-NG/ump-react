import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

const COLS = [
  { h: "Explore", links: [["Home", "/"], ["Marketplace", "/market"], ["Services", "/services"], ["Hostel Hub", "/hostel"], ["Store", "/store"]] },
  { h: "Account", links: [["Sign In", "/login"], ["Create Account", "/login"], ["My Cart", "/cart"], ["Messages", "/messages"]] },
  { h: "Support", links: [["Help Centre", "#"], ["FAQs", "#"], ["Report Issue", "#"], ["Privacy Policy", "#"]] },
  { h: "Company", links: [["About UMP", "#"], ["Blog", "#"], ["Careers", "#"], ["Contact", "#"]] },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <div className="footer">
      <Logo />
      <p style={{ fontSize: "1.3rem", color: "var(--ink-3)", marginTop: 10, marginBottom: 20, lineHeight: 1.6 }}>
        Built for students, by students. Your campus marketplace, services and hostels — all in one place.
      </p>
      <div className="footer-cols">
        {COLS.map((col) => (
          <div key={col.h}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 10 }}>
              {col.h}
            </div>
            {col.links.map(([label, path]) => (
              <div
                key={label}
                onClick={() => path !== "#" ? navigate(path) : undefined}
                style={{ fontSize: "1.3rem", color: "var(--ink-3)", marginBottom: 6, cursor: path !== "#" ? "pointer" : "default" }}
              >
                {label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {["facebook-f", "twitter", "instagram", "linkedin-in"].map((ic) => (
          <div key={ic} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <i className={`fab fa-${ic}`} style={{ fontSize: "1.3rem" }} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16, fontSize: "1.1rem", color: "var(--ink-3)" }}>
        © {new Date().getFullYear()} UMP — University Marketplace · All rights reserved.
      </div>
    </div>
  );
}
