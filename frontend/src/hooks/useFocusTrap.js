import { useEffect, useRef } from "react";

// Attach the returned ref (plus tabIndex={-1}) to a modal's outermost focusable
// container. Moves focus into the modal on open, traps Tab/Shift+Tab so it can't
// escape to controls underneath, restores focus to whatever was focused before
// on close, and calls onClose on Escape.
//
// Pass enabled=false while a nested modal (e.g. an image cropper opened from
// within this one) is on top — otherwise both modals' window keydown listeners
// fire on every Tab press, and this modal's trap can steal focus back to its
// own (now visually covered) controls out from under the one on top.
export default function useFocusTrap(onClose, enabled = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    const previouslyFocused = document.activeElement;
    el?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !el) return;
      const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, enabled]);

  return containerRef;
}
