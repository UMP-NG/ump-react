import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import Skel from "../components/Skel";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";
import { socket } from "../utils/socket";

// Issue type → supportRole mapping
const ISSUE_TYPES = [
  { label: "Technical issue", desc: "App bugs, login problems, broken features", role: "technical", icon: "fa-wrench" },
  { label: "Orders & Payments", desc: "Payment disputes, refunds, order status", role: "administrative", icon: "fa-credit-card" },
  { label: "Account help", desc: "Verification, seller approval, account access", role: "administrative", icon: "fa-user-shield" },
  { label: "Advertise on UMP", desc: "Sponsored posts, banners, promotional campaigns", role: "administrative", icon: "fa-bullhorn" },
];

function UMPContactPicker({ onSelect, onClose }) {
  const [step, setStep] = useState("pick"); // "pick" | "loading" | "error"
  const [error, setError] = useState("");

  async function choose(issueType) {
    setStep("loading");
    try {
      const admins = await apiFetch(`/api/admins/support/team?role=${issueType.role}`);
      const list = Array.isArray(admins) ? admins : [];
      if (list.length === 0) {
        setError(`No ${issueType.label} support admin is currently available. Please try again later.`);
        setStep("error");
        return;
      }
      // Pick randomly so load is spread across all admins assigned to this role
      const admin = list[Math.floor(Math.random() * list.length)];
      onSelect({ _id: admin._id, name: admin.name || "UMP Support", avatar: admin.avatar, issueType: issueType.label });
    } catch {
      setError("Couldn't reach support. Please try again.");
      setStep("error");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.45)" }} onClick={onClose}>
      <div style={{ background: "var(--paper)", borderRadius: 16, width: "min(420px, 92vw)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "#1e293b", padding: "20px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "#f59e0b", fontSize: "1.4rem" }}></i>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.6rem" }}>Contact UMP Support</span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "1.2rem", margin: 0 }}>Choose the type of issue and we'll connect you with the right team.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.6rem", padding: 0, lineHeight: 1, marginLeft: 12 }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px 20px" }}>
          {step === "loading" && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-3)" }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2rem" }}></i>
              <p style={{ marginTop: 10, fontSize: "1.3rem" }}>Finding the right admin…</p>
            </div>
          )}
          {step === "error" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "2rem", color: "#f59e0b", marginBottom: 10 }}></i>
              <p style={{ fontSize: "1.3rem", color: "var(--ink-2)", marginBottom: 16 }}>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("pick")}>Try again</button>
            </div>
          )}
          {step === "pick" && ISSUE_TYPES.map((t) => (
            <button
              key={t.label}
              onClick={() => choose(t)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", marginBottom: 10, textAlign: "left", transition: "border-color .12s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`fa-solid ${t.icon}`} style={{ color: "#f59e0b", fontSize: "1.3rem" }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.35rem", color: "var(--ink-1)", marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>{t.desc}</div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ marginLeft: "auto", color: "var(--ink-4)", fontSize: "1rem" }}></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAvatarUrl(avatar) {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  return avatar.url || null;
}

function Avatar({ avatar, name, size = 44 }) {
  const url = getAvatarUrl(avatar);
  const initial = (name || "U")[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {url
        ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <Ph kind="portrait-3" label={initial} />}
    </div>
  );
}

// Shield badge shown next to admin names
function AdminBadge({ small = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: "#1e293b", color: "#f59e0b",
      borderRadius: 4, padding: small ? "1px 5px" : "2px 7px",
      fontSize: small ? "1rem" : "1.1rem", fontWeight: 700,
      flexShrink: 0, letterSpacing: "0.01em",
    }}>
      <i className="fa-solid fa-shield-halved" style={{ fontSize: small ? "0.85rem" : "0.95rem" }}></i>
      {small ? "Admin" : "UMP Admin"}
    </span>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const withId   = searchParams.get("with");
  const withName = searchParams.get("name") || "Seller";

  const [convos, setConvos]           = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [authError, setAuthError]     = useState(false);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("All");
  const [showPicker, setShowPicker]   = useState(false);
  const [activeThread, setActiveThread] = useState(
    withId ? { receiverId: withId, otherUser: { _id: withId, name: withName } } : null
  );

  function loadConvos() {
    setLoadingList(true);
    setAuthError(false);
    apiFetch("/api/messages/conversations")
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.conversations || []);
        setConvos(list);
        list.forEach((c) => {
          if ((c.unreadCount || 0) > 0) {
            const otherId = c.conversationWith || c._id;
            apiFetch(`/api/messages/conversation/${otherId}/read`, { method: "PUT" }).catch(() => {});
          }
        });
      })
      .catch((err) => { if (err?.status === 401) setAuthError(true); })
      .finally(() => setLoadingList(false));
  }

  useEffect(() => { loadConvos(); }, []);

  // Auto-open support picker when arriving from the "Advertise on UMP" banner
  useEffect(() => {
    if (searchParams.get("advertise") === "1") setShowPicker(true);
  }, [searchParams]);

  function openThread(convo) {
    const receiverId = convo.receiverId || convo.conversationWith || convo._id;
    const otherUser  = convo.otherUser  || { _id: receiverId, name: convo.name, avatar: convo.avatar, roles: convo.roles };
    setActiveThread({ ...convo, receiverId, otherUser });
    // Immediately clear the unread badge in the sidebar
    if ((convo.unreadCount || 0) > 0) {
      setConvos((prev) =>
        prev.map((c) => {
          const cId = c.conversationWith?.toString() || c._id?.toString();
          return cId === receiverId.toString() ? { ...c, unreadCount: 0 } : c;
        })
      );
      apiFetch(`/api/messages/conversation/${receiverId}/read`, { method: "PUT" }).catch(() => {});
    }
  }

  const filtered = convos.filter((c) => {
    const name = c.name || c.otherUser?.name || "";
    if (search) return name.toLowerCase().includes(search.toLowerCase());
    if (filter === "Unread") return (c.unreadCount || 0) > 0;
    return true;
  });

  return (
    <div className={`msg-layout${activeThread ? " view-thread" : ""}`}>
      <Navbar />

      <div className="msg-body">
        {/* ── Left sidebar ── */}
        <div className="msg-sidebar">
          <div style={{ padding: "16px 16px 10px", flexShrink: 0, borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Messages</h2>
            </div>
            <div className="search-wrap">
              <i className="fas fa-magnifying-glass search-icon" />
              <input
                className="input"
                placeholder="Search conversations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 38, padding: "8px 12px 8px 38px", fontSize: "1.35rem" }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {["All", "Unread"].map((f) => (
                <span
                  key={f}
                  className={`chip${filter === f ? " active" : ""}`}
                  style={{ cursor: "pointer", fontSize: "1.2rem", padding: "4px 12px" }}
                  onClick={() => setFilter(f)}
                >{f}</span>
              ))}
            </div>
          </div>

          {/* Pinned UMP Team contact */}
          <button
            onClick={() => setShowPicker(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "rgba(30,41,59,.05)", border: "none", borderBottom: "2px solid rgba(245,158,11,.25)", cursor: "pointer", textAlign: "left" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "#f59e0b", fontSize: "1.5rem" }}></i>
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 13, height: 13, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--paper)" }}></span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <strong style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--ink-1)" }}>UMP Team</strong>
                <span style={{ background: "#1e293b", color: "#f59e0b", borderRadius: 4, padding: "1px 6px", fontSize: "1rem", fontWeight: 700 }}>Support</span>
              </div>
              <span style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Get help from our support team</span>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: "var(--ink-4)", fontSize: "1rem" }}></i>
          </button>

          <div className="msg-sidebar-scroll">
            {loadingList ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)" }}>
                    <Skel.Circle size={48} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                      <Skel.Line w="55%" h={13} />
                      <Skel.Line w="80%" h={11} />
                    </div>
                    <Skel w={36} h={11} r={4} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ) : authError ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <i className="fas fa-lock" style={{ fontSize: "2.8rem", color: "var(--ink-4)", marginBottom: 12 }} />
                {user ? (
                  <>
                    <p style={{ fontSize: "1.4rem", color: "var(--ink-2)", marginBottom: 8 }}>Session expired</p>
                    <p style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginBottom: 16 }}>Your session timed out. Sign in again to continue.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>Sign in again</button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "1.4rem", color: "var(--ink-2)", marginBottom: 16 }}>Sign in to view messages</p>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>Sign in</button>
                  </>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <i className="fas fa-comments" style={{ fontSize: "2.8rem", color: "var(--ink-4)", marginBottom: 12 }} />
                <p style={{ fontSize: "1.4rem", color: "var(--ink-2)" }}>No conversations yet</p>
              </div>
            ) : (
              filtered.map((c) => {
                const name     = c.name || c.otherUser?.name || "User";
                const preview  = c.latestMessage || c.lastMessage || "";
                const time     = c.latestCreatedAt || c.lastMessageTime
                  ? formatTime(c.latestCreatedAt || c.lastMessageTime)
                  : "";
                const unread   = c.unreadCount || 0;
                const key      = c.conversationWith?.toString() || c._id?.toString();
                const isActive = activeThread?.receiverId?.toString() === (c.conversationWith?.toString() || c._id?.toString());
                const isAdmin  = Array.isArray(c.roles) && c.roles.includes("admin");

                return (
                  <button
                    key={key}
                    onClick={() => openThread(c)}
                    className={`msg-convo-item${isActive ? " active" : ""}`}
                    style={{
                      width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
                      background: isAdmin && !isActive ? "rgba(30,41,59,.04)" : "transparent",
                      border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left", transition: "background .12s",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <Avatar avatar={c.avatar || c.otherUser?.avatar} name={name} size={48} />
                      {isAdmin && (
                        <span style={{
                          position: "absolute", bottom: -2, right: -2,
                          width: 16, height: 16, borderRadius: "50%",
                          background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center",
                          border: "2px solid var(--paper)",
                        }}>
                          <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "#f59e0b" }}></i>
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <strong style={{ fontSize: "1.4rem", fontWeight: unread ? 700 : 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</strong>
                          {isAdmin && <AdminBadge small />}
                        </div>
                        <span style={{ fontSize: "1.1rem", color: unread ? "var(--accent)" : "var(--ink-3)", fontWeight: unread ? 700 : 400, flexShrink: 0 }}>{time}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.25rem", color: unread ? "var(--ink-2)" : "var(--ink-3)", fontWeight: unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isAdmin && c.isAdminLastMessage && <i className="fa-solid fa-shield-halved" style={{ marginRight: 4, fontSize: "1rem", color: "#f59e0b" }}></i>}
                          {preview || "No messages yet"}
                        </span>
                        {unread > 0 && (
                          <span style={{ background: isAdmin ? "#1e293b" : "var(--accent)", color: isAdmin ? "#f59e0b" : "#fff", minWidth: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, flexShrink: 0 }}>{unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <BottomNav />
        </div>

        {/* ── Right panel ── */}
        <div className="msg-panel">
          {activeThread
            ? <MsgThread convo={activeThread} onBack={() => setActiveThread(null)} />
            : <EmptyPanel />}
        </div>
      </div>

      {showPicker && (
        <UMPContactPicker
          onClose={() => setShowPicker(false)}
          onSelect={(admin) => {
            setShowPicker(false);
            setActiveThread({
              receiverId: admin._id,
              otherUser: {
                _id:    admin._id,
                name:   admin.name,
                avatar: admin.avatar,
                roles:  ["admin"],
              },
            });
          }}
        />
      )}
    </div>
  );
}

// ─── Book at negotiated rate button (buyer / service) ────────────────────────
function BookAtNegotiatedRateButton({ meta }) {
  const navigate = useNavigate();
  const fmt = (n) => "₦" + Number(n).toLocaleString("en-NG");
  return (
    <button
      onClick={() => navigate(`/services/${meta.itemId}`, { state: { negotiationId: meta.negotiationId, negotiatedRate: meta.proposedPrice } })}
      style={{
        width: "100%", padding: "9px 0", borderRadius: 8,
        background: "var(--accent)", color: "#fff",
        border: "none", cursor: "pointer",
        fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-sans)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      <i className="fas fa-calendar-check" /> Book at {fmt(meta.proposedPrice)}
    </button>
  );
}

// ─── Negotiation card rendered inside a chat bubble ───────────────────────────
function NegotiationCard({ msg, iAmSeller, onRespond, onApply }) {
  const meta = msg.meta || {};
  const [acting, setActing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cardError, setCardError] = useState("");
  const status = msg._negotiationStatus || meta.status || "pending";

  const fmt = (n) => "₦" + Number(n).toLocaleString("en-NG");

  const statusColor = status === "accepted" ? "#16a34a" : status === "rejected" ? "#ef4444" : "#f59e0b";
  const statusLabel = status === "accepted" ? "Accepted" : status === "rejected" ? "Rejected" : "Pending";
  const statusIcon  = status === "accepted" ? "fa-check-circle" : status === "rejected" ? "fa-times-circle" : "fa-clock";

  async function respond(action) {
    if (acting) return;
    setActing(true);
    setCardError("");
    try {
      await onRespond(msg.negotiationId, action);
    } catch (err) {
      setCardError(err?.body?.message || err?.message || "Action failed. Try again.");
    } finally {
      setActing(false);
    }
  }

  async function applyPrice() {
    if (applying) return;
    setApplying(true);
    setCardError("");
    try {
      await onApply(msg.negotiationId);
    } catch (err) {
      setCardError(err?.body?.message || err?.message || "Could not apply price. Try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{
      background: "var(--white)", border: "1px solid var(--line)", borderRadius: 14,
      overflow: "hidden", minWidth: 240, maxWidth: 320,
    }}>
      {/* Item preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 10px" }}>
        {meta.itemImage ? (
          <img src={meta.itemImage} alt={meta.itemName} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fas fa-box" style={{ color: "var(--ink-4)" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink-1)" }}>
            {meta.itemName}
          </div>
          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>
            {meta.itemType === "Service" ? "Service" : "Product"}
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div style={{ padding: "0 12px 10px", display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.05rem", color: "var(--ink-4)", marginBottom: 1 }}>Listed price</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--ink-2)", textDecoration: "line-through" }}>{fmt(meta.originalPrice)}</div>
        </div>
        <i className="fas fa-arrow-right" style={{ color: "var(--ink-4)", fontSize: "1rem" }} />
        <div>
          <div style={{ fontSize: "1.05rem", color: "var(--ink-4)", marginBottom: 1 }}>Offer</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{fmt(meta.proposedPrice)}</div>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ padding: "6px 12px", background: "var(--surface)", display: "flex", alignItems: "center", gap: 6 }}>
        <i className={`fas ${statusIcon}`} style={{ color: statusColor, fontSize: "1rem" }} />
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: statusColor }}>{statusLabel}</span>
      </div>

      {/* Seller actions — only on the initiating (non-response) card, when pending */}
      {iAmSeller && !meta.isResponse && status === "pending" && (
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid var(--line)" }}>
          <button
            onClick={() => respond("reject")}
            disabled={acting}
            style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderRight: "1px solid var(--line)", cursor: acting ? "default" : "pointer", fontSize: "1.25rem", fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-sans)" }}
          >
            {acting ? <i className="fas fa-spinner fa-spin" /> : "Reject"}
          </button>
          <button
            onClick={() => respond("accept")}
            disabled={acting}
            style={{ flex: 1, padding: "10px 0", background: "none", border: "none", cursor: acting ? "default" : "pointer", fontSize: "1.25rem", fontWeight: 700, color: "#16a34a", fontFamily: "var(--font-sans)" }}
          >
            {acting ? <i className="fas fa-spinner fa-spin" /> : "Accept"}
          </button>
        </div>
      )}

      {/* Apply-to-cart button — seller sees this on the response card after accepting a Product negotiation */}
      {iAmSeller && meta.isResponse && meta.canApply && meta.itemType === "Product" && (
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--line)" }}>
          <button
            onClick={applyPrice}
            disabled={applying || meta._applied}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8,
              background: applying || meta._applied ? "var(--surface)" : "var(--accent)",
              color: applying || meta._applied ? "var(--ink-3)" : "#fff",
              border: "none", cursor: applying || meta._applied ? "default" : "pointer",
              fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-sans)",
            }}
          >
            {applying
              ? <><i className="fas fa-spinner fa-spin" /> Applying…</>
              : meta._applied
              ? <><i className="fas fa-check" /> Price applied to cart</>
              : <><i className="fas fa-cart-plus" /> Apply price to buyer's cart</>}
          </button>
        </div>
      )}

      {/* Book-at-negotiated-rate button — buyer sees this on the response card after a Service negotiation is accepted */}
      {!iAmSeller && meta.isResponse && meta.canApply && meta.itemType === "Service" && !meta._applied && (
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--line)" }}>
          <BookAtNegotiatedRateButton meta={meta} />
        </div>
      )}
      {!iAmSeller && meta.isResponse && meta.itemType === "Service" && meta._applied && (
        <div style={{ padding: "8px 12px 10px", borderTop: "1px solid var(--line)", fontSize: "1.15rem", color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
          <i className="fas fa-check-circle" /> Booked at negotiated rate
        </div>
      )}

      {cardError && (
        <div style={{ padding: "6px 12px 10px", fontSize: "1.1rem", color: "#ef4444", display: "flex", alignItems: "center", gap: 5 }}>
          <i className="fas fa-circle-exclamation" style={{ fontSize: "0.9rem" }} /> {cardError}
        </div>
      )}
    </div>
  );
}

// Compare calendar dates (midnight-to-midnight), not elapsed milliseconds.
// Math.floor((now - d) / 86400000) counts 24h blocks, so a message from
// 11:58 PM yesterday reads as diffDays=0 ("today") at 00:02 AM — wrong.
function calendarDayDiff(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msgDay = new Date(iso);
  msgDay.setHours(0, 0, 0, 0);
  return Math.round((today - msgDay) / 86400000);
}

function formatTime(iso) {
  const d = new Date(iso);
  const diffDays = calendarDayDiff(iso);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Timestamp shown inside each message bubble — always includes the time;
// adds date context when the message is not from today.
function formatMessageTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffDays = calendarDayDiff(iso);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: diffDays > 365 ? "numeric" : undefined })} ${time}`;
}

// Label shown in the date-separator row between messages from different calendar days.
function formatDateSeparator(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffDays = calendarDayDiff(iso);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: diffDays > 365 ? "numeric" : undefined });
}

function EmptyPanel() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--surface)", color: "var(--ink-3)" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
        <i className="fas fa-comments" />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink-2)", margin: "0 0 4px" }}>Your messages</p>
        <p style={{ fontSize: "1.3rem", margin: 0 }}>Select a conversation to start chatting</p>
      </div>
    </div>
  );
}

function MsgThread({ convo, onBack }) {
  const navigate   = useNavigate();
  const { user }   = useUser();
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [authError, setAuthError] = useState(false);
  const bottomRef  = useRef(null);

  const other      = convo?.otherUser || {};
  const receiverId = convo?.receiverId || convo?.conversationWith || other._id;
  const otherIsAdmin = other.roles?.includes("admin") ?? convo?.roles?.includes("admin") ?? false;
  const iAmAdmin     = user?.roles?.includes("admin") ?? false;

  const mapMessage = useCallback((m) => {
    const senderId = typeof m.sender === "object" ? m.sender?._id?.toString() : m.sender?.toString();
    const isAdminMsg = m.isAdminMessage || m.sender?.roles?.includes("admin");
    return { ...m, isOwn: senderId !== receiverId?.toString(), isAdminMessage: !!isAdminMsg };
  }, [receiverId]);

  useEffect(() => {
    if (!receiverId) { setLoading(false); return; }
    setLoading(true);
    setMessages([]);
    apiFetch(`/api/messages/user?conversationWith=${receiverId}`)
      .then((d) => {
        const raw    = Array.isArray(d) ? d : (d.messages || []);
        const sorted = [...raw].reverse();
        setMessages(sorted.map(mapMessage));
        apiFetch(`/api/messages/conversation/${receiverId}/read`, { method: "PUT" }).catch(() => {});
      })
      .catch((err) => { if (err?.status === 401) setAuthError(true); })
      .finally(() => setLoading(false));
  }, [receiverId, mapMessage]);

  // Listen for real-time negotiation status changes
  useEffect(() => {
    function onNegotiationUpdate({ negotiationId, status }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.negotiationId?.toString() === negotiationId?.toString()
            ? { ...m, _negotiationStatus: status }
            : m
        )
      );
    }
    socket.on("negotiation_update", onNegotiationUpdate);
    return () => socket.off("negotiation_update", onNegotiationUpdate);
  }, []);

  // Listen for incoming real-time messages from the OTHER person in this thread.
  // We deliberately skip messages where we are the sender — those are already
  // added optimistically in send(), so processing them here would duplicate them.
  useEffect(() => {
    function onNewMessage(msg) {
      const senderId = typeof msg.sender === "object" ? msg.sender?._id?.toString() : msg.sender?.toString();
      const myId     = user?._id?.toString();
      if (senderId === myId) return;                        // own message — skip
      if (senderId !== receiverId?.toString()) return;      // different thread — skip
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, mapMessage(msg)];
      });
    }
    socket.on("new_message", onNewMessage);
    return () => socket.off("new_message", onNewMessage);
  }, [receiverId, mapMessage, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNegotiationRespond(negotiationId, action) {
    await apiFetch(`/api/negotiations/${negotiationId}/respond`, {
      method: "PUT",
      body: { action },
    });
    setMessages((prev) =>
      prev.map((m) =>
        m.negotiationId?.toString() === negotiationId?.toString()
          ? { ...m, _negotiationStatus: action === "accept" ? "accepted" : "rejected" }
          : m
      )
    );
  }

  async function handleApplyPrice(negotiationId) {
    await apiFetch(`/api/negotiations/${negotiationId}/apply`, { method: "PUT" });
    setMessages((prev) =>
      prev.map((m) =>
        m.negotiationId?.toString() === negotiationId?.toString()
          ? { ...m, meta: { ...(m.meta || {}), _applied: true } }
          : m
      )
    );
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const draft = text.trim();
    const optimistic = {
      _id: `opt_${Date.now()}`,
      content: draft,
      isOwn: true,
      isAdminMessage: iAmAdmin,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    try {
      await apiFetch("/api/messages/send", { method: "POST", body: { receiver: receiverId, text: draft } });
    } catch (err) {
      if (err?.status === 401) setAuthError(true);
    } finally {
      setSending(false);
    }
  }

  if (authError) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <i className="fas fa-lock" style={{ fontSize: "3rem", color: "var(--ink-4)" }} />
      <p style={{ fontSize: "1.5rem", color: "var(--ink-2)", textAlign: "center" }}>Session expired — please sign in again</p>
      <button className="btn btn-primary" onClick={() => navigate("/login")}>Sign in again</button>
      <button className="btn btn-ghost" onClick={onBack}>Go back</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Thread header */}
      <div style={{
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--line)", flexShrink: 0,
        background: otherIsAdmin ? "#1e293b" : "var(--paper)",
      }}>
        <button className="icon-btn mob-only" onClick={onBack} style={{ marginRight: 4, color: otherIsAdmin ? "#fff" : undefined }}>
          <i className="fas fa-arrow-left" />
        </button>
        <div style={{ position: "relative" }}>
          <Avatar avatar={other.avatar} name={other.name} size={40} />
          {otherIsAdmin && (
            <span style={{
              position: "absolute", bottom: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #1e293b",
            }}>
              <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.65rem", color: "#1e293b" }}></i>
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: "1.5rem", display: "block", color: otherIsAdmin ? "#fff" : "var(--ink-1)" }}>
              {other.name || "User"}
            </strong>
            {otherIsAdmin && <AdminBadge />}
          </div>
          <span style={{ fontSize: "1.1rem", color: otherIsAdmin ? "#94a3b8" : "var(--ink-3)" }}>
            {otherIsAdmin ? "Official UMP Support" : other.role || "Member"}
          </span>
        </div>
        {iAmAdmin && (
          <span style={{ fontSize: "1.1rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
            <i className="fa-solid fa-shield-halved"></i> Messaging as Admin
          </span>
        )}
      </div>

      {/* Admin conversation notice banner */}
      {otherIsAdmin && (
        <div style={{
          padding: "8px 16px", background: "rgba(30,41,59,.06)",
          borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8,
          fontSize: "1.2rem", color: "var(--ink-2)",
        }}>
          <i className="fa-solid fa-shield-halved" style={{ color: "#f59e0b" }}></i>
          This is an official UMP support conversation. Messages are monitored for quality.
        </div>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8, background: "var(--surface)" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
                <Skel w={i % 3 === 0 ? 180 : i % 2 === 0 ? 220 : 160} h={38} r={18} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--ink-3)", fontSize: "1.3rem" }}>
            <i className="fas fa-lock" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
            Messages are end-to-end encrypted
          </div>
        ) : null}

        {messages.map((msg, idx) => {
          const isMe        = msg.isOwn;
          const isAdminMsg  = msg.isAdminMessage;
          const isNegotiation = msg.type === "negotiation" && msg.meta;

          // Show a date separator whenever the calendar day changes between messages
          const prevMsg = messages[idx - 1];
          const showDateSep = !prevMsg || (
            msg.createdAt && prevMsg.createdAt &&
            new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()
          );

          // For negotiation cards, the "seller" is the person receiving the initial offer
          // iAmSeller = I am not the one who sent this particular message (the one offering)
          // More precisely: on the initiating card (isResponse=false), the seller is msg.receiver
          // We check: the current user is the seller (receiver of the initial offer) = !isMe when !meta.isResponse
          const iAmSellerOnThisCard = isNegotiation && (
            msg.meta.isResponse ? isMe : !isMe
          );

          // Bubble styles
          let bubbleBg, bubbleColor, borderRadius;
          if (isNegotiation) {
            bubbleBg    = "transparent";
            bubbleColor = "var(--ink-1)";
            borderRadius = 0;
          } else if (isMe && isAdminMsg) {
            bubbleBg    = "#1e293b";
            bubbleColor = "#f1f5f9";
            borderRadius = "18px 18px 4px 18px";
          } else if (!isMe && isAdminMsg) {
            bubbleBg    = "#1e293b";
            bubbleColor = "#f1f5f9";
            borderRadius = "18px 18px 18px 4px";
          } else if (isMe) {
            bubbleBg    = "var(--accent)";
            bubbleColor = "#fff";
            borderRadius = "18px 18px 4px 18px";
          } else {
            bubbleBg    = "var(--white)";
            bubbleColor = "var(--ink-1)";
            borderRadius = "18px 18px 18px 4px";
          }

          return (
            <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 3 }}>

              {/* Date separator between messages from different calendar days */}
              {showDateSep && msg.createdAt && (
                <div style={{ alignSelf: "center", margin: "8px 0 4px", display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                  <span style={{ fontSize: "1.05rem", color: "var(--ink-3)", whiteSpace: "nowrap", padding: "2px 10px", background: "var(--surface)", borderRadius: 20, border: "1px solid var(--line)" }}>
                    {formatDateSeparator(msg.createdAt)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                </div>
              )}

              {/* Admin label above incoming admin message */}
              {!isMe && isAdminMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 4, marginBottom: 1 }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: "1rem", color: "#f59e0b" }}></i>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", letterSpacing: "0.02em" }}>UMP Team</span>
                </div>
              )}

              {/* Negotiation label */}
              {isNegotiation && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0, marginBottom: 2 }}>
                  <i className="fas fa-handshake" style={{ fontSize: "1rem", color: "var(--accent)" }} />
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink-2)" }}>
                    {msg.meta?.isResponse ? "Negotiation response" : "Price negotiation"}
                  </span>
                </div>
              )}

              <div style={{
                background: bubbleBg,
                color: bubbleColor,
                padding: isNegotiation ? 0 : "9px 14px",
                borderRadius,
                fontSize: "1.4rem",
                lineHeight: 1.45,
                maxWidth: isNegotiation ? 340 : "72%",
                boxShadow: isAdminMsg ? "0 2px 8px rgba(30,41,59,.2)" : isNegotiation ? "none" : "0 1px 4px rgba(0,0,0,.07)",
                wordBreak: "break-word",
                border: isAdminMsg ? "1px solid rgba(245,158,11,.15)" : "none",
              }}>
                {isNegotiation ? (
                  <NegotiationCard
                    msg={msg}
                    iAmSeller={iAmSellerOnThisCard}
                    onRespond={handleNegotiationRespond}
                    onApply={handleApplyPrice}
                  />
                ) : (
                  msg.content || msg.text
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                <span style={{ fontSize: "1rem", color: "var(--ink-3)" }}>
                  {formatMessageTime(msg.createdAt)}
                </span>
                {isMe && isAdminMsg && (
                  <span style={{ fontSize: "1rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.8rem" }}></i> Admin
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: "10px 14px 16px", borderTop: "1px solid var(--line)", background: "var(--paper)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {iAmAdmin && (
          <span style={{ fontSize: "1rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontWeight: 600 }}>
            <i className="fa-solid fa-shield-halved"></i>
          </span>
        )}
        <div style={{ flex: 1, background: "var(--surface)", borderRadius: "var(--r-pill)", padding: "9px 16px", display: "flex", alignItems: "center", border: `1px solid ${iAmAdmin ? "rgba(245,158,11,.4)" : "var(--line)"}`, transition: "border-color .15s" }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = iAmAdmin ? "#f59e0b" : "var(--accent)"}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = iAmAdmin ? "rgba(245,158,11,.4)" : "var(--line)"}
        >
          <input
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "1.4rem", fontFamily: "var(--font-sans)", color: "var(--ink-1)" }}
            placeholder={iAmAdmin ? "Message as UMP Admin…" : "Message…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="icon-btn"
          style={{ background: text.trim() ? (iAmAdmin ? "#1e293b" : "var(--accent)") : "var(--surface)", color: text.trim() ? (iAmAdmin ? "#f59e0b" : "#fff") : "var(--ink-3)", width: 42, height: 42, borderRadius: "50%", transition: "background .15s, color .15s", flexShrink: 0 }}
          disabled={!text.trim() || sending}
        >
          {sending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
        </button>
      </form>
    </div>
  );
}
