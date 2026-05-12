import { useEffect } from "react";

// deps — pass dynamic values (e.g. products.length) so the observer
// re-runs after async data loads and new DOM nodes appear.
export default function useReveal(selector, deps = []) {
  useEffect(() => {
    let observer;

    // rAF gives React one frame to flush the new DOM nodes before observing
    const raf = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      document.querySelectorAll(selector).forEach((el) => observer.observe(el));
    });

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);
}
