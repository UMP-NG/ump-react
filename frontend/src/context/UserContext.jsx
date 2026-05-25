import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, getToken } from "../utils/api";
import { socket } from "../utils/socket";
import { subscribeToPush } from "../utils/push";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest

  const fetchMe = useCallback((retryCount = 0) => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    apiFetch("/api/auth/me")
      .then((data) => setUser(data?.user || data || null))
      .catch((err) => {
        if (err?.status === 401) {
          // Real session expiry — log out
          setUser(null);
        } else if (retryCount < 2) {
          // Network error (server restarting, cold start, etc.) — retry with backoff
          setTimeout(() => fetchMe(retryCount + 1), 2000 * (retryCount + 1));
        } else {
          // Gave up after retries — log out so the user can re-authenticate
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

  useEffect(() => {
    fetchMe();

    // Also react to 401s fired from any other API call in the app
    function handleLogout() { setUser(null); }
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
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
