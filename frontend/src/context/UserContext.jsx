import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, getToken } from "../utils/api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest

  useEffect(() => {
    // Skip the round-trip when no token is stored — avoids a pointless 401
    // All login flows (email + Google) always store a token in localStorage,
    // so a missing token reliably means the user is a guest.
    if (!getToken()) {
      setUser(null);
      return;
    }
    apiFetch("/api/auth/me")
      .then((data) => setUser(data?.user || data || null))
      .catch(() => setUser(null));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
