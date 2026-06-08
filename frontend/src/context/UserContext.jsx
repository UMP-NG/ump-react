import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, getToken } from "../utils/api";
import { socket } from "../utils/socket";
import { subscribeToPush } from "../utils/push";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest
  const retryTimerRef = useRef(null);

  const fetchMe = useCallback((retryCount = 0) => {
    apiFetch("/api/auth/me")
      .then((data) => setUser(data?.user || data || null))
      .catch((err) => {
        if (err?.status === 401) {
          setUser(null);
        } else if (retryCount < 2) {
          retryTimerRef.current = setTimeout(() => fetchMe(retryCount + 1), 2000 * (retryCount + 1));
        } else {
          setUser(null);
        }
      });
  }, []);

  // Connect / disconnect socket and subscribe to push as auth state changes
  useEffect(() => {
    if (user) {
      const uid = user._id || user.id;
      if (!socket.connected) socket.connect();
      socket.emit("register", uid);
      // Subscribe to Web Push (asks permission on first login, silent on repeat)
      subscribeToPush().catch(() => {});
    } else if (user === null) {
      // null = confirmed logged out (not undefined = still loading)
      if (socket.connected) socket.disconnect();
    }
  }, [user]);

  // Re-subscribe when the app becomes visible again (handles mobile subscription expiry
  // caused by Chrome silent updates or FCM endpoint rotation — at most once per 5 minutes)
  useEffect(() => {
    if (!user) return;
    let lastAttempt = 0;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastAttempt < 5 * 60 * 1000) return;
      lastAttempt = now;
      subscribeToPush().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  useEffect(() => {
    fetchMe();

    function handleLogout() { setUser(null); }
    window.addEventListener("auth:logout", handleLogout);
    return () => {
      window.removeEventListener("auth:logout", handleLogout);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [fetchMe]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
