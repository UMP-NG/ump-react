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

function P({ children, style }) {
  return (
    <p style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 12px", ...style }}>
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

export default function Terms() {
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.2)", borderRadius: "var(--r-pill)", padding: "4px 14px", marginBottom: 16 }}>
            <i className="fas fa-file-contract" style={{ color: "var(--accent)", fontSize: "1.1rem" }} />
            <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>Legal Document</span>
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px", color: "var(--ink-1)" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "1.3rem", color: "var(--ink-3)", margin: 0 }}>
            Effective: {EFFECTIVE} · UMP Technologies · <a href="https://www.myump.com.ng" style={{ color: "var(--accent)" }}>myump.com.ng</a>
          </p>
        </div>

        <InfoBox icon="circle-info">
          Welcome to UMP. By signing up, accessing, or using the UMP platform you agree to be bound by these Terms of Service,
          our <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/privacy")}>Privacy Policy</span>,
          and all policies incorporated by reference. Please read them carefully.
          If you do not agree, do not use UMP.
        </InfoBox>

        {/* ── 1. About UMP ──────────────────────────────────────────────── */}
        <H2>1. About UMP</H2>
        <P>
          UMP (University Marketplace Platform) is a digital campus marketplace operated by <strong>UMP Technologies</strong>.
          UMP helps UNILAG students discover products, services, and off-campus accommodations while enabling sellers
          and service providers to reach more customers within the campus community.
        </P>
        <P>
          UMP acts as a platform intermediary and does not directly own, manufacture, or sell most listed products or
          services unless explicitly stated otherwise.
        </P>

        {/* ── 2. Acceptance ─────────────────────────────────────────────── */}
        <H2>2. Acceptance of Terms</H2>
        <P>By creating an account or using UMP, you confirm that:</P>
        <UL items={[
          "You are at least 16 years old (or have a guardian's consent if required by law).",
          "All information you provide is truthful and accurate.",
          "You agree to follow all platform rules, policies, and these Terms.",
          "You understand that UMP is a campus-focused platform intended primarily for UNILAG students and affiliates.",
        ]} />
        <P>If you do not agree with any part of these Terms, please do not create an account or use UMP.</P>

        {/* ── 3. User Eligibility & Accounts ────────────────────────────── */}
        <H2>3. User Eligibility & Accounts</H2>
        <P>To access full platform features, users must link a verified UNILAG student email address (<em>matricnumber@live.unilag.edu.ng</em>).
          Users who sign in with a personal Google account without linking a school email will have limited, buyer-only access until
          verification is complete.</P>
        <P>You are responsible for:</P>
        <UL items={[
          "Maintaining the confidentiality of your account credentials.",
          "All activity that occurs under your account.",
          "Notifying UMP immediately of any unauthorised account access.",
        ]} />
        <P>UMP reserves the right to refuse account creation or suspend accounts at its discretion.</P>

        {/* ── 4. User Responsibilities ──────────────────────────────────── */}
        <H2>4. User Responsibilities</H2>
        <P>All users agree to:</P>
        <UL items={[
          "Provide truthful information in profiles, listings, and communications.",
          "Use the platform respectfully and in compliance with Nigerian law.",
          "Avoid fraudulent, misleading, or deceptive activity.",
          "Not impersonate any person, business, or official institution.",
          "Not upload harmful, illegal, obscene, or offensive content.",
          "Not attempt to damage, exploit, or interfere with platform systems.",
          "Not use bots, scrapers, or automated tools without written permission.",
        ]} />
        <P>UMP reserves the right to suspend or permanently remove accounts that violate these rules.</P>

        {/* ── 5. Community Guidelines ───────────────────────────────────── */}
        <H2>5. Community Guidelines</H2>
        <P>UMP is built on respect, trust, and campus community. All users must abide by the following guidelines:</P>

        <H3>5.1 Respect Others</H3>
        <P>Harassment, hate speech, bullying, threats, or discrimination based on gender, ethnicity, religion, or any
          protected characteristic is strictly prohibited. Treat every user with dignity.</P>

        <H3>5.2 No Fraud or Scams</H3>
        <P>Users may not scam others, impersonate individuals or businesses, create fake listings, or manipulate
          transactions. Fraudulent activity may result in permanent bans and may be reported to relevant authorities.</P>

        <H3>5.3 Honest Listings</H3>
        <P>All product, service, and accommodation listings must be truthful, accurate, and representative of what
          is actually being offered. Intentional misrepresentation is prohibited.</P>

        <H3>5.4 No Spam</H3>
        <P>Avoid repetitive posting, excessive promotions, fake engagement, or content irrelevant to the platform's purpose.</P>

        <H3>5.5 Appropriate Content Only</H3>
        <P>Users must not upload explicit content, violent material, illegal media, or any content harmful to minors.</P>

        <H3>5.6 Respect Campus Rules</H3>
        <P>UMP does not support activities that violate university regulations, including the illegal resale, transfer,
          or subletting of school-allocated hostel spaces or bedspaces.</P>

        <H3>5.7 Report Problems</H3>
        <P>Users are encouraged to report scams, fake listings, abusive behaviour, or suspicious activity to
          UMP via <a href="mailto:admin@myump.com.ng" style={{ color: "var(--accent)" }}>admin@myump.com.ng</a>.</P>

        <H3>5.8 Enforcement</H3>
        <P>UMP reserves the right to remove content, restrict features, suspend accounts, or permanently ban users
          who violate these guidelines, with or without prior notice.</P>

        {/* ── 6. Prohibited Items & Services ────────────────────────────── */}
        <H2>6. Prohibited Items & Services</H2>
        <P>The following items and services are strictly prohibited on UMP:</P>
        <UL items={[
          "Illegal drugs, controlled substances, or drug paraphernalia.",
          "Weapons, firearms, ammunition, or dangerous items.",
          "Stolen goods or items obtained through illegal means.",
          "Fraudulent schemes, Ponzi arrangements, or pyramid sales.",
          "Fake or counterfeit products, documents, or certificates.",
          "Adult, explicit, or sexually suggestive content.",
          "Gambling-related products, services, or activities.",
          "Any product or service prohibited under Nigerian law.",
          "School-owned hostel spaces, government-allocated bedspaces, or any accommodation whose resale violates university regulations.",
        ]} />
        <InfoBox icon="triangle-exclamation" color="#dc2626" bg="rgba(220,38,38,.05)">
          <strong>Hostel & Bedspace Listings:</strong> UMP strictly prohibits the listing, sale, transfer, or advertisement of
          school-owned hostel spaces or government-allocated bedspaces. Users found engaging in such activities may
          have their listings immediately removed and accounts suspended or permanently banned. UMP does not support
          activities that violate university policies or Nigerian law.
        </InfoBox>
        <P>UMP reserves the right to remove any listing at any time without prior notice.</P>

        {/* ── 7. Hostel & Accommodation Listings ────────────────────────── */}
        <H2>7. Hostel & Accommodation Listings</H2>
        <P>Users listing hostels or private accommodations must provide accurate and complete information including:</P>
        <UL items={[
          "Accurate pricing (monthly/annually) with no hidden fees.",
          "Honest description of amenities, facilities, and rules.",
          "Genuine images of the actual property.",
          "Correct location and proximity information.",
          "Availability status and move-in conditions.",
        ]} />
        <P>
          UMP is not a party to any agreement between landlords, agents, or students regarding accommodation.
          UMP is not responsible for disputes arising from hostel listings.
          <strong> Users are strongly advised to physically inspect any accommodation and verify all details
          before making any payment.</strong>
        </P>

        {/* ── 8. Payments & Platform Safety ─────────────────────────────── */}
        <H2>8. Payments & Platform Safety</H2>
        <InfoBox icon="shield-halved" color="#16a34a" bg="rgba(22,163,74,.05)">
          <strong>For maximum protection, always use UMP's integrated payment system.</strong> Payments processed
          through UMP are subject to buyer protection where applicable.
        </InfoBox>

        <P>
          UMP strongly advises users <strong>NOT</strong> to send money directly to sellers outside the platform.
          If a buyer chooses to transfer funds directly to a seller, make payments outside the platform, or bypass
          the official payment process, they do so <strong>entirely at their own risk</strong>.
        </P>
        <P>UMP will not be responsible for scams, failed deliveries, fraudulent sellers, or financial losses
          resulting from off-platform payments.</P>

        {/* ── 9. Platform Fees & Monetisation ───────────────────────────── */}
        <H2>9. Platform Fees & Monetisation</H2>
        <P>To support platform operations, infrastructure, maintenance, security, and marketplace services, UMP
          charges certain fees to sellers and service providers. These fees are applied reasonably and fairly and
          are disclosed in the relevant sections of the platform.</P>

        <H3>9.1 Seller Commission</H3>
        <P>UMP charges a <strong>5% commission</strong> on completed product transactions. This commission supports
          platform development, maintenance, marketplace infrastructure, security, customer support, and operational
          costs. The commission may be automatically deducted during payment processing where applicable.</P>

        <H3>9.2 Service Provider Subscription (Future)</H3>
        <P>Service providers (tutors, designers, freelancers, repairers, beauty providers, etc.) may be required to
          pay a recurring visibility subscription fee after an initial onboarding period of approximately three (3) months.
          The current planned subscription fee is <strong>₦3,000 per month</strong>. This provides benefits including
          increased visibility, priority discovery, enhanced listings, and promotional exposure. UMP reserves the right
          to modify subscription pricing or features with advance notice.</P>

        <H3>9.3 Seller Verification Programme</H3>
        <P>UMP offers an <em>optional</em> verification programme for sellers and businesses. Verified sellers receive
          a verification badge, increased visibility, homepage exposure, and enhanced trust within the marketplace.
          Verification is not required to sell. The current verification fee is <strong>₦2,000</strong>. UMP may
          revoke verification status in cases of fraud, policy violations, or impersonation. Verification does not
          guarantee sales, traffic, or platform endorsement.</P>

        {/* ── 10. Refund & Dispute Policy ───────────────────────────────── */}
        <H2>10. Refund & Dispute Policy</H2>

        <H3>10.1 Buyer Protection</H3>
        <P>UMP aims to create a safer marketplace experience. Buyers are encouraged to use UMP's integrated payment
          system to qualify for buyer protection where available.</P>

        <H3>10.2 Complaint Window</H3>
        <P>If a buyer receives damaged goods, defective items, incorrect products, or items significantly different
          from their description, the buyer <strong>must file a complaint within 24–48 hours</strong> of receiving
          the item. Complaints submitted after this period may not be eligible for review.</P>

        <H3>10.3 Evidence Requirement</H3>
        <P>Buyers may be asked to provide photos, videos, screenshots, chat records, or other evidence related to
          the dispute. False claims may result in account penalties.</P>

        <H3>10.4 Refund Eligibility</H3>
        <P>Refunds may be approved where the seller clearly violated listing terms, the item was materially
          misrepresented, or the item arrived damaged or defective. UMP investigates disputes fairly and impartially.</P>

        <H3>10.5 Partial Refunds</H3>
        <P>Approved refunds may be partial rather than full. Certain platform charges, transaction fees, operational
          costs, and service commissions may already have been deducted and are <strong>non-refundable</strong>.</P>

        <H3>10.6 Seller Cooperation</H3>
        <P>Sellers are expected to cooperate during investigations and resolution processes. Repeated complaints
          may result in account suspension or restrictions.</P>

        <H3>10.7 Final Decisions</H3>
        <P>UMP reserves the right to make final decisions regarding disputes, refunds, and platform enforcement
          actions. These decisions are binding within the scope of the platform.</P>

        {/* ── 11. Seller & Service Provider Terms ──────────────────────── */}
        <H2>11. Seller & Service Provider Terms</H2>
        <P>By registering as a seller or service provider on UMP, you agree to the following in addition to the
          general Terms above:</P>

        <H3>11.1 Seller Eligibility</H3>
        <P>To sell on UMP, sellers must be verified UNILAG students or affiliates, provide accurate business
          information, comply with Nigerian laws, and follow all UMP policies. UMP reserves the right to reject
          or remove seller accounts.</P>

        <H3>11.2 Listing Rules</H3>
        <UL items={[
          "Upload truthful, complete, and accurate product or service descriptions.",
          "Provide genuine pricing — no hidden fees or bait-and-switch tactics.",
          "Use authentic images of the actual product or service where possible.",
          "Clearly state the condition, quantity, and terms of sale.",
        ]} />

        <H3>11.3 Seller Conduct</H3>
        <UL items={[
          "Communicate respectfully with all buyers and platform staff.",
          "Avoid harassment, spam, or unsolicited messaging.",
          "Fulfil all confirmed orders honestly and within agreed timeframes.",
          "Avoid fraudulent activity, fake orders, or review manipulation.",
          "Comply with all applicable Nigerian consumer protection laws.",
        ]} />

        <H3>11.4 Seller Responsibilities</H3>
        <P>Sellers are fully responsible for their products, customer interactions, deliveries, returns, and
          refunds (where applicable), and all transactions conducted through or outside the platform.</P>

        <H3>11.5 Seller Analytics</H3>
        <P>UMP may provide sellers with analytics data including views, engagement, customer activity, and
          performance insights. These are provided for informational purposes only and do not constitute any
          form of guarantee or warranty.</P>

        <H3>11.6 Account Suspension for Sellers</H3>
        <P>Seller accounts may be suspended or permanently terminated for scamming users, repeated serious
          complaints, policy violations, review manipulation, or actions that harm platform trust.</P>

        {/* ── 12. Reviews & Ratings ─────────────────────────────────────── */}
        <H2>12. Reviews & Ratings</H2>
        <P>Users may leave honest reviews and ratings based on genuine experiences. UMP reserves the right
          to remove fake reviews, abusive reviews, spam, or defamatory content. Attempting to manipulate
          ratings or incentivise fake reviews may result in account suspension.</P>

        {/* ── 13. Intellectual Property ─────────────────────────────────── */}
        <H2>13. Intellectual Property</H2>
        <P>All UMP branding, logos, designs, platform features, UI elements, and original content are owned
          by UMP Technologies unless otherwise stated. Users may not copy, reproduce, resell, or reverse-engineer
          any part of the platform without written permission from UMP Technologies.</P>
        <P>Users retain ownership of the content they upload (listings, photos, descriptions) but grant UMP
          a non-exclusive, royalty-free licence to display, promote, and use that content for platform operations
          and marketing purposes.</P>

        {/* ── 14. Suspension & Termination ──────────────────────────────── */}
        <H2>14. Account Suspension & Termination</H2>
        <P>UMP may suspend, restrict, or permanently terminate user accounts that:</P>
        <UL items={[
          "Violate these Terms of Service or any UMP policy.",
          "Engage in fraudulent, deceptive, or scam activities.",
          "Repeatedly receive serious complaints from other users.",
          "Harm other users, third parties, or the platform itself.",
          "Attempt to manipulate listings, reviews, or platform metrics.",
          "Engage in any activity that violates Nigerian law.",
        ]} />
        <P>Termination may occur without prior notice in severe cases. Users whose accounts are terminated
          forfeit any pending balances or credits held on the platform, subject to applicable law.</P>

        {/* ── 15. Limitation of Liability ───────────────────────────────── */}
        <H2>15. Limitation of Liability</H2>
        <P>UMP functions primarily as a discovery and connection platform. To the fullest extent permitted
          by Nigerian law, UMP Technologies is not liable for:</P>
        <UL items={[
          "Seller or buyer misconduct, fraud, or negligence.",
          "Financial losses from off-platform transactions.",
          "Product defects, service failures, or dissatisfaction.",
          "Personal disputes between buyers and sellers.",
          "Actions taken by third-party service providers.",
          "Downtime, technical errors, or loss of data.",
        ]} />
        <P>Users interact with each other at their own risk and are encouraged to exercise due diligence
          before any transaction, especially high-value ones.</P>

        {/* ── 16. Privacy ───────────────────────────────────────────────── */}
        <H2>16. Privacy</H2>
        <P>By using UMP, you consent to the collection and use of your information as described in our{" "}
          <span
            style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
            onClick={() => navigate("/privacy")}
          >
            Privacy Policy
          </span>.
          UMP will not intentionally sell personal user data to third parties without your consent.
        </P>

        {/* ── 17. Governing Law ─────────────────────────────────────────── */}
        <H2>17. Governing Law</H2>
        <P>These Terms of Service are governed by and construed in accordance with the laws of the
          Federal Republic of Nigeria. Any dispute arising from the use of UMP that cannot be resolved
          through the platform's internal dispute process shall be referred to the appropriate courts
          in Lagos State, Nigeria.</P>

        {/* ── 18. Changes ───────────────────────────────────────────────── */}
        <H2>18. Changes to These Terms</H2>
        <P>UMP reserves the right to update these Terms of Service at any time. Users will be notified
          of significant updates through in-app notifications or email where necessary. Continued use
          of the platform after changes are published constitutes acceptance of the revised Terms.</P>

        {/* ── 19. Contact ───────────────────────────────────────────────── */}
        <H2>19. Contact Us</H2>
        <P>For questions, complaints, or support regarding these Terms:</P>
        <div style={{ background: "var(--surface)", borderRadius: 12, padding: "16px 20px", marginTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "envelope",   label: "Email",     value: "admin@myump.com.ng",   href: "mailto:admin@myump.com.ng" },
              { icon: "globe",      label: "Website",   value: "www.myump.com.ng",      href: "https://www.myump.com.ng" },
              { icon: "instagram",  label: "Instagram", value: "@shop.myump",           href: "https://www.instagram.com/shop.myump?igsh=MjdyNHd0MTdlcDJs&utm_source=qr" },
            ].map(({ icon, label, value, href }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(249,115,22,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fa${icon === "instagram" ? "b" : "s"} fa-${icon}`} style={{ color: "var(--accent)", fontSize: "1.3rem" }} />
                </div>
                <div>
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600 }}>{label}</div>
                  <a href={href} style={{ fontSize: "1.3rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{value}</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer agreement */}
        <div style={{ marginTop: 36, padding: "16px 20px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 12, textAlign: "center" }}>
          <i className="fas fa-handshake" style={{ color: "var(--accent)", fontSize: "2rem", marginBottom: 10, display: "block" }} />
          <div style={{ fontSize: "1.35rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
            By signing up and using UMP, you confirm that you have read, understood, and agreed to these Terms of Service.
          </div>
        </div>
      </div>
    </div>
  );
}
