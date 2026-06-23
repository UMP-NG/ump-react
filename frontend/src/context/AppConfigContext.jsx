import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, bustCache } from "../utils/api";

const DEFAULT_LOGO = "/images/ump-logo.png";
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

const CACHE_KEY = "ump_app_config";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h — admin changes are rare

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function applyConfig(data, setters) {
  const { setLogoUrl, setSlides, setFlags, setFees, setEvents, setSubscriptions } = setters;
  if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
  if (data.slides)    setSlides(data.slides);
  if (data.flags)     setFlags(data.flags);
  if (data.fees)      setFees({ ...DEFAULT_FEES, ...data.fees });
  if (data.events)    setEvents(data.events);
  if (data.subscriptions) {
    setSubscriptions(s => {
      const deepMerge = (def, srv) => ({
        monthly: { ...def.monthly, ...(srv?.monthly || {}) },
        annual:  { ...def.annual,  ...(srv?.annual  || {}) },
      });
      return {
        seller:   deepMerge(s.seller,   data.subscriptions.seller),
        provider: deepMerge(s.provider, data.subscriptions.provider),
      };
    });
  }
}

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
  const [cached] = useState(loadCache); // lazy init — loadCache() runs exactly once
  const [logoUrl, setLogoUrl]           = useState(cached?.logoUrl || DEFAULT_LOGO);
  const [slides, setSlides]             = useState(cached?.slides  || []);
  const [flags, setFlags]               = useState(cached?.flags   || {});
  const [fees, setFees]                 = useState(cached?.fees    || DEFAULT_FEES);
  const [subscriptions, setSubscriptions] = useState(cached?.subscriptions || DEFAULT_SUBS);
  const [events, setEvents]             = useState(cached?.events  || []);

  const setters = { setLogoUrl, setSlides, setFlags, setFees, setEvents, setSubscriptions };

  const refreshConfig = useCallback(() => {
    bustCache("/api/admins/config/public");
    apiFetch("/api/admins/config/public")
      .then((d) => {
        const normalized = {
          logoUrl: d?.logo?.url || DEFAULT_LOGO,
          slides:  d?.slides,
          flags:   d?.flags,
          fees:    d?.fees,
          events:  d?.events,
          subscriptions: d?.subscriptions,
        };
        applyConfig(normalized, setters);
        saveCache(normalized);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshConfig();
    // Poll every 5 min — config (logo, flags, fees) changes infrequently
    const id = setInterval(refreshConfig, 5 * 60_000);
    return () => clearInterval(id);
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
