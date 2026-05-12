import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest

  useEffect(() => {
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
