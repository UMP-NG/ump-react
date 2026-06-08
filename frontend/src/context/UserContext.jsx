import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, getToken } from "../utils/api";
import { socket } from "../utils/socket";
import { subscribeToPush } from "../utils/push";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest
  const retryTimerRef    = useRef(null);
  const lastPushAttemptRef = useRef(0);

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

  // When the server sends an "account" notification (e.g. identity approved, ban lifted),
  // re-fetch the user so isLimitedAccount and other flags update immediately without a reload.
  useEffect(() => {
    if (!user) return;
    function onNotif(notif) {
      if (notif?.type === "account") fetchMe();
    }
    socket.on("new_notification", onNotif);
    return () => socket.off("new_notification", onNotif);
  }, [user, fetchMe]);

  // Re-subscribe when the app becomes visible again (handles mobile subscription expiry
  // caused by Chrome silent updates or FCM endpoint rotation — at most once per 5 minutes).
  // lastPushAttemptRef is a ref so the throttle survives user-object identity changes
  // (e.g. profile updates) without resetting the 5-minute window.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastPushAttemptRef.current < 5 * 60 * 1000) return;
      lastPushAttemptRef.current = now;
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
