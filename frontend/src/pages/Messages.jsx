import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import Skel from "../components/Skel";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";

// Issue type → supportRole mapping
const ISSUE_TYPES = [
  { label: "Technical issue", desc: "App bugs, login problems, broken features", role: "technical", icon: "fa-wrench" },
  { label: "Orders & Payments", desc: "Payment disputes, refunds, order status", role: "administrative", icon: "fa-credit-card" },
  { label: "Account help", desc: "Verification, seller approval, account access", role: "administrative", icon: "fa-user-shield" },
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
      // Pick first available admin for this role
      const admin = list[0];
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
    withId ? { receiverId: withId, otherUser: { _id: withId, name: decodeURIComponent(withName) } } : null
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

  function openThread(convo) {
    const receiverId = convo.receiverId || convo.conversationWith || convo._id;
    const otherUser  = convo.otherUser  || { _id: receiverId, name: convo.name, avatar: convo.avatar, roles: convo.roles };
    setActiveThread({ ...convo, receiverId, otherUser });
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

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
  const otherIsAdmin = Array.isArray(other.roles)
    ? other.roles.includes("admin")
    : Array.isArray(convo?.roles) && convo.roles.includes("admin");
  const iAmAdmin   = Array.isArray(user?.roles) && user.roles.includes("admin");

  useEffect(() => {
    if (!receiverId) { setLoading(false); return; }
    setLoading(true);
    setMessages([]);
    apiFetch(`/api/messages/user?conversationWith=${receiverId}`)
      .then((d) => {
        const raw    = Array.isArray(d) ? d : (d.messages || []);
        const sorted = [...raw].reverse();
        setMessages(sorted.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender?._id?.toString() : m.sender?.toString();
          const isAdminMsg = m.isAdminMessage
            || Array.isArray(m.sender?.roles) && m.sender.roles.includes("admin");
          return { ...m, isOwn: senderId !== receiverId.toString(), isAdminMessage: !!isAdminMsg };
        }));
        apiFetch(`/api/messages/conversation/${receiverId}/read`, { method: "PUT" }).catch(() => {});
      })
      .catch((err) => { if (err?.status === 401) setAuthError(true); })
      .finally(() => setLoading(false));
  }, [receiverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

        {messages.map((msg) => {
          const isMe       = msg.isOwn;
          const isAdminMsg = msg.isAdminMessage;

          // Bubble styles
          let bubbleBg, bubbleColor, borderRadius;
          if (isMe && isAdminMsg) {
            // Admin's own sent messages — deep navy with gold accent
            bubbleBg    = "#1e293b";
            bubbleColor = "#f1f5f9";
            borderRadius = "18px 18px 4px 18px";
          } else if (!isMe && isAdminMsg) {
            // User receiving admin message — dark slate
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

              {/* Admin label above incoming admin message */}
              {!isMe && isAdminMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 4, marginBottom: 1 }}>
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: "1rem", color: "#f59e0b" }}></i>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", letterSpacing: "0.02em" }}>UMP Team</span>
                </div>
              )}

              <div style={{
                background: bubbleBg,
                color: bubbleColor,
                padding: "9px 14px",
                borderRadius,
                fontSize: "1.4rem",
                lineHeight: 1.45,
                maxWidth: "72%",
                boxShadow: isAdminMsg ? "0 2px 8px rgba(30,41,59,.2)" : "0 1px 4px rgba(0,0,0,.07)",
                wordBreak: "break-word",
                border: isAdminMsg ? "1px solid rgba(245,158,11,.15)" : "none",
              }}>
                {msg.content || msg.text}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                <span style={{ fontSize: "1rem", color: "var(--ink-3)" }}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                {/* Admin sent indicator on own messages */}
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
