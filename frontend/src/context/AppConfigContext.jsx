import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, bustCache } from "../utils/api";

const DEFAULT_LOGO = "/images/ump-icon.svg";

const AppConfigContext = createContext({
  logoUrl: DEFAULT_LOGO,
  slides: [],
  flags: {},
  refreshConfig: () => {},
});

export function AppConfigProvider({ children }) {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [slides, setSlides] = useState([]);
  const [flags, setFlags] = useState({});

  const refreshConfig = useCallback(() => {
    bustCache("/api/admins/config");
    apiFetch("/api/admins/config")
      .then((d) => {
        setLogoUrl(d?.logo?.url || DEFAULT_LOGO);
        if (d?.slides) setSlides(d.slides);
        if (d?.flags) setFlags(d.flags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <AppConfigContext.Provider value={{ logoUrl, slides, flags, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
