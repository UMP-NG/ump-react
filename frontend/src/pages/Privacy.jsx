import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const EFFECTIVE = "22 May 2026";

function H2({ children }) {
  return (
    <h2 style={{
      fontSize: "1.7rem", fontWeight: 800, color: "var(--ink-1)",
      margin: "36px 0 10px", paddingBottom: 8,
      borderBottom: "2px solid var(--line)",
      letterSpacing: "-0.01em",
    }}>
      {children}
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--ink-1)", margin: "20px 0 8px" }}>
      {children}
    </h3>
  );
}

function P({ children }) {
  return (
    <p style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

function UL({ items }) {
  return (
    <ul style={{ margin: "6px 0 12px", paddingLeft: 20 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ icon, color, bg, children }) {
  return (
    <div style={{ background: bg || "rgba(249,115,22,.06)", border: `1px solid ${color || "rgba(249,115,22,.2)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <i className={`fas fa-${icon}`} style={{ color: color || "var(--accent)", marginTop: 2, flexShrink: 0 }} />
      <div style={{ fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <Navbar />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 100px" }}>
        {/* Back button */}
        <div style={{ padding: "12px 0 0" }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: "24px 0 8px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.2)", borderRadius: "var(--r-pill)", padding: "4px 14px", marginBottom: 16 }}>
            <i className="fas fa-shield-halved" style={{ color: "#3b82f6", fontSize: "1.1rem" }} />
            <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#3b82f6" }}>Privacy Document</span>
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px", color: "var(--ink-1)" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "1.3rem", color: "var(--ink-3)", margin: 0 }}>
            Effective: {EFFECTIVE} · UMP Technologies · <a href="https://www.myump.com.ng" style={{ color: "var(--accent)" }}>myump.com.ng</a>
          </p>
        </div>

        <InfoBox icon="circle-info" color="#3b82f6" bg="rgba(59,130,246,.05)">
          UMP values your privacy and is committed to protecting your personal information.
          By using UMP, you agree to the collection and use of information as described in this Privacy Policy.
          This policy is designed to comply with the Nigeria Data Protection Regulation (NDPR) and applicable Nigerian law.
        </InfoBox>

        {/* ── 1. Information We Collect ──────────────────────────────────── */}
        <H2>1. Information We Collect</H2>
        <P>When you use UMP, we may collect the following types of information:</P>

        <H3>1.1 Account Information</H3>
        <UL items={[
          "Full name and display name.",
          "Email address (personal Google email and/or UNILAG school email).",
          "Matriculation number (required for student verification).",
          "Phone number (optional, for delivery coordination).",
          "Profile photo and bio.",
          "Password hash (for email/password accounts — stored securely, never in plain text).",
        ]} />

        <H3>1.2 Seller & Provider Information</H3>
        <UL items={[
          "Store name, business name, and description.",
          "Product listings, service listings, and hostel listings.",
          "Store logo, banner images, and media uploads.",
          "Bank account details (for payout processing — stored securely).",
          "Certifications, portfolio links, and availability data.",
        ]} />

        <H3>1.3 Transaction & Activity Data</H3>
        <UL items={[
          "Order history, cart contents, and purchase records.",
          "Payment transaction records (processed via Paystack).",
          "Message threads and communication history on the platform.",
          "Reviews and ratings submitted.",
          "Wishlist items and browsing history.",
        ]} />

        <H3>1.4 Technical & Device Data</H3>
        <UL items={[
          "Device type, operating system, and browser information.",
          "IP address and general location data.",
          "App usage patterns and interaction analytics.",
          "Push notification token (Firebase Cloud Messaging token), if you grant notification permission.",
          "Session and authentication tokens.",
        ]} />

        {/* ── 2. How We Use Your Information ────────────────────────────── */}
        <H2>2. How We Use Your Information</H2>
        <P>UMP uses collected information to:</P>
        <UL items={[
          "Create, maintain, and secure your account.",
          "Verify student identity via UNILAG email and matriculation number.",
          "Enable buyers to discover and purchase products, services, and accommodations.",
          "Enable sellers and providers to receive orders and manage their storefronts.",
          "Process payments and facilitate payouts to sellers.",
          "Send order updates, account notifications, and platform communications.",
          "Deliver push notifications when you have granted permission.",
          "Detect and prevent fraud, scams, and platform abuse.",
          "Analyse platform usage to improve performance and user experience.",
          "Enforce these Terms and all platform policies.",
          "Contact you regarding support requests or account issues.",
        ]} />

        {/* ── 3. Push Notifications ─────────────────────────────────────── */}
        <H2>3. Push Notifications</H2>
        <P>UMP uses <strong>Firebase Cloud Messaging (FCM)</strong>, a service by Google, to deliver real-time push
          notifications to your device when you grant notification permission.</P>
        <P>When you enable push notifications, UMP stores a device-specific FCM token associated with your account.
          This token is used solely to deliver notifications about orders, messages, account activity, and platform
          updates relevant to you.</P>
        <P>You can disable push notifications at any time from <strong>Settings → Notifications</strong>. Disabling
          removes your FCM token from our systems.</P>

        {/* ── 4. Google Sign-In ─────────────────────────────────────────── */}
        <H2>4. Google Sign-In (OAuth)</H2>
        <P>UMP offers sign-in via Google OAuth, powered by <strong>Firebase Authentication</strong>. When you
          sign in with Google, UMP receives your:</P>
        <UL items={[
          "Name and profile photo from your Google account.",
          "Google email address.",
          "A unique Google user ID.",
        ]} />
        <P>UMP does not receive your Google password. Your Google account data is used solely to create and
          identify your UMP account. Google's own privacy policy governs data shared during the OAuth process.</P>

        {/* ── 5. Third-Party Services ───────────────────────────────────── */}
        <H2>5. Third-Party Services</H2>
        <P>UMP integrates with the following third-party services, each of which processes data according to
          its own privacy policy:</P>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {[
            { name: "Firebase (Google)", purpose: "Authentication, push notifications, and real-time features.", icon: "fire" },
            { name: "Paystack",          purpose: "Payment processing, card transactions, and payout management.", icon: "credit-card" },
            { name: "Cloudinary",        purpose: "Image and file hosting for profile photos, product images, and media uploads.", icon: "image" },
            { name: "MongoDB Atlas",     purpose: "Database hosting and storage for all platform data.", icon: "database" },
            { name: "Render / Hosting",  purpose: "Cloud server infrastructure for running the UMP platform.", icon: "server" },
          ].map(({ name, purpose, icon }) => (
            <div key={name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: "var(--surface)", borderRadius: 10 }}>
              <i className={`fas fa-${icon}`} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--ink-1)" }}>{name}</div>
                <div style={{ fontSize: "1.25rem", color: "var(--ink-3)", marginTop: 2 }}>{purpose}</div>
              </div>
            </div>
          ))}
        </div>

        <P>These services may process your data on servers outside Nigeria. By using UMP, you consent to
          this data processing in accordance with each service provider's privacy policy.</P>

        {/* ── 6. Data Sharing ───────────────────────────────────────────── */}
        <H2>6. Data Sharing</H2>
        <P>UMP does not sell your personal data to third parties. However, limited information may be shared
          where necessary for:</P>
        <UL items={[
          "Platform operations (e.g. order fulfilment, message delivery).",
          "Payment processing (e.g. sharing payout details with Paystack).",
          "Legal compliance — where required by Nigerian law or a court order.",
          "Fraud prevention and platform security.",
          "Public listings — product, service, and hostel listings are publicly visible to all platform users.",
        ]} />

        {/* ── 7. Cookies & Analytics ────────────────────────────────────── */}
        <H2>7. Cookies & Analytics</H2>
        <P>UMP uses browser cookies and local storage to:</P>
        <UL items={[
          "Maintain your login session.",
          "Remember user preferences.",
          "Analyse platform usage and performance.",
          "Improve content recommendations and search results.",
        ]} />
        <P>You can clear cookies through your browser settings. Disabling cookies may affect certain platform features.</P>

        {/* ── 8. Data Protection & Security ─────────────────────────────── */}
        <H2>8. Data Protection & Security</H2>
        <P>UMP takes reasonable and appropriate technical and organisational measures to protect your personal
          data from unauthorised access, disclosure, alteration, or destruction. These measures include:</P>
        <UL items={[
          "Encrypted communication via HTTPS.",
          "Secure password hashing (bcrypt).",
          "JWT-based authentication with httpOnly cookie storage.",
          "Database access controls and environment variable protection.",
          "Regular security reviews and updates.",
        ]} />
        <InfoBox icon="triangle-exclamation" color="#f59e0b" bg="rgba(245,158,11,.05)">
          No online platform can guarantee absolute security. While we work hard to protect your data, we cannot
          warrant complete security of information transmitted over the internet. You use UMP at your own risk and
          are responsible for protecting your account credentials.
        </InfoBox>

        {/* ── 9. User Responsibilities ──────────────────────────────────── */}
        <H2>9. Your Privacy Responsibilities</H2>
        <P>You are responsible for:</P>
        <UL items={[
          "Keeping your password and login credentials confidential.",
          "Logging out of shared or public devices.",
          "Not sharing sensitive personal information publicly in listings or messages.",
          "Reporting suspected unauthorised access to your account immediately.",
        ]} />

        {/* ── 10. Data Retention ────────────────────────────────────────── */}
        <H2>10. Data Retention</H2>
        <P>UMP retains your personal data for as long as your account is active or as needed to provide
          services, comply with legal obligations, resolve disputes, and enforce agreements.</P>
        <P>When you delete your account, UMP will delete or anonymise your personal data within a reasonable
          period, except where retention is required by law (e.g. financial transaction records).</P>

        {/* ── 11. Your Rights (NDPR) ────────────────────────────────────── */}
        <H2>11. Your Rights Under NDPR</H2>
        <P>In accordance with the <strong>Nigeria Data Protection Regulation (NDPR)</strong>, you have the right to:</P>
        <UL items={[
          "Access the personal data UMP holds about you.",
          "Request correction of inaccurate or incomplete data.",
          "Request deletion of your personal data (right to erasure), subject to legal obligations.",
          "Object to or restrict certain processing of your data.",
          "Receive a copy of your data in a portable format.",
          "Withdraw consent to optional data processing at any time.",
        ]} />
        <P>To exercise any of these rights, contact us at <a href="mailto:admin@myump.com.ng" style={{ color: "var(--accent)" }}>admin@myump.com.ng</a>.</P>

        {/* ── 12. Children's Privacy ────────────────────────────────────── */}
        <H2>12. Children's Privacy</H2>
        <P>UMP is not intended for children under the age of 16. We do not knowingly collect personal data
          from children under 16. If you believe a child has provided us with personal data, please contact
          us immediately and we will take steps to remove it.</P>

        {/* ── 13. Changes to This Policy ────────────────────────────────── */}
        <H2>13. Changes to This Policy</H2>
        <P>UMP reserves the right to update this Privacy Policy at any time. When changes are made, the
          "Effective" date at the top of this page will be updated. For significant changes, we will notify
          users via in-app notification or email. Continued use of the platform after changes are published
          constitutes acceptance of the revised policy.</P>

        {/* ── 14. Contact ───────────────────────────────────────────────── */}
        <H2>14. Contact Us</H2>
        <P>For privacy-related questions, data access requests, or concerns:</P>
        <div style={{ background: "var(--surface)", borderRadius: 12, padding: "16px 20px", marginTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "envelope",   label: "Email",     value: "admin@myump.com.ng",   href: "mailto:admin@myump.com.ng" },
              { icon: "globe",      label: "Website",   value: "www.myump.com.ng",      href: "https://www.myump.com.ng" },
              { icon: "instagram",  label: "Instagram", value: "@shop.myump",           href: "https://www.instagram.com/shop.myump?igsh=MjdyNHd0MTdlcDJs&utm_source=qr" },
            ].map(({ icon, label, value, href }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(59,130,246,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fa${icon === "instagram" ? "b" : "s"} fa-${icon}`} style={{ color: "#3b82f6", fontSize: "1.3rem" }} />
                </div>
                <div>
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600 }}>{label}</div>
                  <a href={href} style={{ fontSize: "1.3rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{value}</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms link */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: "1.3rem", color: "var(--ink-3)" }}>
          Also read our{" "}
          <span
            style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
            onClick={() => navigate("/terms")}
          >
            Terms of Service
          </span>
        </div>
      </div>
    </div>
  );
}
