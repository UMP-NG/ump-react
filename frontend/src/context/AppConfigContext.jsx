import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, bustCache } from "../utils/api";

const DEFAULT_LOGO = "/images/ump-icon.svg";
const DEFAULT_FEES = { platformFee: 3.2, serviceFee: 5.0, minPayout: 2000, payoutCadence: 'Daily' };

const AppConfigContext = createContext({
  logoUrl: DEFAULT_LOGO,
  slides: [],
  flags: {},
  fees: DEFAULT_FEES,
  refreshConfig: () => {},
});

export function AppConfigProvider({ children }) {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [slides, setSlides] = useState([]);
  const [flags, setFlags] = useState({});
  const [fees, setFees] = useState(DEFAULT_FEES);

  const refreshConfig = useCallback(() => {
    bustCache("/api/admins/config");
    apiFetch("/api/admins/config")
      .then((d) => {
        setLogoUrl(d?.logo?.url || DEFAULT_LOGO);
        if (d?.slides) setSlides(d.slides);
        if (d?.flags) setFlags(d.flags);
        if (d?.fees) setFees(f => ({ ...DEFAULT_FEES, ...f, ...d.fees }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <AppConfigContext.Provider value={{ logoUrl, slides, flags, fees, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
