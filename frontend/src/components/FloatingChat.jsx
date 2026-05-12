import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";

export default function FloatingChat() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (pathname.startsWith("/messages")) {
      setUnread(0);
      return;
    }
    if (!user) return;
    apiFetch("/api/messages/unread-count")
      .then((d) => setUnread(Number(d?.count ?? d?.unread ?? 0)))
      .catch(() => {});
  }, [user, pathname]);

  if (pathname.startsWith("/messages")) return null;

  return (
    <button className="chat-fab" onClick={() => navigate("/messages")} title="Messages">
      <i className="fas fa-comment-dots" />
      {unread > 0 && (
        <span className="chat-fab-badge">{unread > 9 ? "9+" : unread}</span>
      )}
    </button>
  );
}
