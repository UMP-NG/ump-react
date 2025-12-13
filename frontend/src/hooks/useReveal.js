import { useEffect } from "react";

export default function useReveal(selector) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(selector).forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);
}
