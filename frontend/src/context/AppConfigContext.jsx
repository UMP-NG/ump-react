import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const DEFAULT_LOGO = "/images/ump-icon.svg";

const AppConfigContext = createContext({ logoUrl: DEFAULT_LOGO });

export function AppConfigProvider({ children }) {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);

  useEffect(() => {
    apiFetch("/api/admins/config")
      .then((d) => {
        if (d?.logo?.url) setLogoUrl(d.logo.url);
      })
      .catch(() => {});
  }, []);

  return (
    <AppConfigContext.Provider value={{ logoUrl }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
