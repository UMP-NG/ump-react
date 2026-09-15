import { useEffect, useRef, useState } from "react";

const DELAY_MS = 60000;
const SESSION_KEY = "ump_discovery_survey_shown";

/**
 * Surfaces a "can't find it?" survey prompt once per browser session, after
 * the user has spent at least a minute actively scrolling a discovery page
 * (Market, Search) without navigating away — a signal they haven't found
 * what they came for. Unmounting the host page (e.g. tapping into a product)
 * cancels the timer, so shoppers who do find something are never interrupted.
 */
export function useDiscoverySurvey() {
  const [show, setShow] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    let alreadyShown = false;
    try { alreadyShown = !!sessionStorage.getItem(SESSION_KEY); } catch { /* ignore */ }
    if (alreadyShown) return;

    function onScroll() { scrolledRef.current = true; }
    window.addEventListener("scroll", onScroll, { passive: true });

    const timer = setTimeout(() => {
      if (scrolledRef.current) setShow(true);
    }, DELAY_MS);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  }

  return { show, dismiss };
}
