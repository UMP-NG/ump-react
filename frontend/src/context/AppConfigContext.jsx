import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, bustCache } from "../utils/api";

const DEFAULT_LOGO = "/images/ump-icon.svg";
const DEFAULT_FEES = {
  serviceChargeEnabled: true,
  serviceFee: 5.0,
  serviceChargeMin: 100,
  serviceChargeMax: 2000,
  platformFeeEnabled: false,
  platformFee: 5.0,
  minPayout: 2000,
  payoutCadence: 'Daily',
};
const DEFAULT_SUBS = {
  seller:   { monthly: { price: 3000, label: "Monthly" }, annual: { price: 25000, label: "Annual", badge: "Save 31%" } },
  provider: { monthly: { price: 3000, label: "Monthly" }, annual: { price: 25000, label: "Annual", badge: "Save 31%" } },
};

const AppConfigContext = createContext({
  logoUrl: DEFAULT_LOGO,
  slides: [],
  flags: {},
  fees: DEFAULT_FEES,
  subscriptions: DEFAULT_SUBS,
  events: [],
  refreshConfig: () => {},
});

export function AppConfigProvider({ children }) {
  const [logoUrl, setLogoUrl]           = useState(DEFAULT_LOGO);
  const [slides, setSlides]             = useState([]);
  const [flags, setFlags]               = useState({});
  const [fees, setFees]                 = useState(DEFAULT_FEES);
  const [subscriptions, setSubscriptions] = useState(DEFAULT_SUBS);
  const [events, setEvents]             = useState([]);

  const refreshConfig = useCallback(() => {
    bustCache("/api/admins/config/public");
    apiFetch("/api/admins/config/public")
      .then((d) => {
        setLogoUrl(d?.logo?.url || DEFAULT_LOGO);
        if (d?.slides) setSlides(d.slides);
        if (d?.flags) setFlags(d.flags);
        if (d?.fees) setFees(f => ({ ...DEFAULT_FEES, ...f, ...d.fees }));
        if (d?.events) setEvents(d.events);
        if (d?.subscriptions) setSubscriptions(s => {
          const deepMerge = (def, srv) => ({
            monthly: { ...def.monthly, ...(srv?.monthly || {}) },
            annual:  { ...def.annual,  ...(srv?.annual  || {}) },
          });
          return {
            seller:   deepMerge(s.seller,   d.subscriptions.seller),
            provider: deepMerge(s.provider, d.subscriptions.provider),
          };
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  return (
    <AppConfigContext.Provider value={{ logoUrl, slides, flags, fees, subscriptions, events, refreshConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
