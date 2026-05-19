import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import Ph from "../components/Ph";
import Skel from "../components/Skel";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";

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

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const withId   = searchParams.get("with");
  const withName = searchParams.get("name") || "Seller";

  const [convos, setConvos]       = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("All");
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
    const otherUser  = convo.otherUser  || { _id: receiverId, name: convo.name, avatar: convo.avatar };
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
          {/* Sidebar header */}
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

          {/* Conversation list */}
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
                const name    = c.name || c.otherUser?.name || "User";
                const preview = c.latestMessage || c.lastMessage || "";
                const time    = c.latestCreatedAt || c.lastMessageTime
                  ? formatTime(c.latestCreatedAt || c.lastMessageTime)
                  : "";
                const unread  = c.unreadCount || 0;
                const key     = c.conversationWith?.toString() || c._id?.toString();
                const isActive = activeThread?.receiverId?.toString() === (c.conversationWith?.toString() || c._id?.toString());

                return (
                  <button
                    key={key}
                    onClick={() => openThread(c)}
                    className={`msg-convo-item${isActive ? " active" : ""}`}
                    style={{ width: "100%", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left", transition: "background .12s" }}
                  >
                    <Avatar avatar={c.avatar || c.otherUser?.avatar} name={name} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <strong style={{ fontSize: "1.4rem", fontWeight: unread ? 700 : 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{name}</strong>
                        <span style={{ fontSize: "1.1rem", color: unread ? "var(--accent)" : "var(--ink-3)", fontWeight: unread ? 700 : 400, flexShrink: 0, marginLeft: 8 }}>{time}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.25rem", color: unread ? "var(--ink-2)" : "var(--ink-3)", fontWeight: unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview || "No messages yet"}</span>
                        {unread > 0 && (
                          <span style={{ background: "var(--accent)", color: "#fff", minWidth: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, flexShrink: 0 }}>{unread}</span>
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
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [authError, setAuthError] = useState(false);
  const bottomRef = useRef(null);

  const other      = convo?.otherUser || {};
  const receiverId = convo?.receiverId || convo?.conversationWith || other._id;

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
          return { ...m, isOwn: senderId !== receiverId.toString() };
        }));
        // mark this conversation's messages as read
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
    const optimistic = { _id: `opt_${Date.now()}`, content: draft, isOwn: true, createdAt: new Date().toISOString() };
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
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)", background: "var(--paper)", flexShrink: 0 }}>
        <button className="icon-btn mob-only" onClick={onBack} style={{ marginRight: 4 }}>
          <i className="fas fa-arrow-left" />
        </button>
        <Avatar avatar={other.avatar} name={other.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: "1.5rem", display: "block" }}>{other.name || "User"}</strong>
          <span style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{other.role || "Member"}</span>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 6, background: "var(--surface)" }}>
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
          const isMe = msg.isOwn;
          return (
            <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2 }}>
              <div style={{
                background: isMe ? "var(--accent)" : "var(--white)",
                color: isMe ? "#fff" : "var(--ink-1)",
                padding: "9px 14px",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                fontSize: "1.4rem",
                lineHeight: 1.45,
                maxWidth: "72%",
                boxShadow: "0 1px 4px rgba(0,0,0,.07)",
                wordBreak: "break-word",
              }}>
                {msg.content || msg.text}
              </div>
              <span style={{ fontSize: "1rem", color: "var(--ink-3)", paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: "10px 14px 16px", borderTop: "1px solid var(--line)", background: "var(--paper)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, background: "var(--surface)", borderRadius: "var(--r-pill)", padding: "9px 16px", display: "flex", alignItems: "center", border: "1px solid var(--line)", transition: "border-color .15s" }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--line)"}
        >
          <input
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "1.4rem", fontFamily: "var(--font-sans)", color: "var(--ink-1)" }}
            placeholder="Message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="icon-btn"
          style={{ background: text.trim() ? "var(--accent)" : "var(--surface)", color: text.trim() ? "#fff" : "var(--ink-3)", width: 42, height: 42, borderRadius: "50%", transition: "background .15s, color .15s", flexShrink: 0 }}
          disabled={!text.trim() || sending}
        >
          {sending ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
        </button>
      </form>
    </div>
  );
}
