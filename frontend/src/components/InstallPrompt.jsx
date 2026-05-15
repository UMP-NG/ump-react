import { useState, useEffect } from "react";

// iPadOS 13+ reports itself as MacIntel but has multiple touch points
function isIosDevice() {
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Covers both the W3C standard and the iOS-proprietary standalone flag
function isAlreadyInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (sessionStorage.getItem("pwa-dismissed")) return;

    if (isIosDevice()) {
      // iOS/Safari never fires beforeinstallprompt — show manual instructions
      // after a short delay so it doesn't appear before the page has loaded
      setIosMode(true);
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }

    // Android / desktop: use the native browser install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installed = () => setShow(false);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    setInstalling(true);
    try {
      prompt.prompt();
      await prompt.userChoice;
    } catch {
      // prompt rejected or unsupported
    } finally {
      setInstalling(false);
      setPrompt(null);
      setShow(false);
    }
  }

  function dismiss() {
    setShow(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  }

  if (!show) return null;

  const bannerBase = {
    position: "fixed",
    bottom: 72,
    left: 16,
    right: 16,
    zIndex: 1500,
    background: "#0f172a",
    color: "#fff",
    borderRadius: 18,
    boxShadow: "0 8px 40px rgba(0,0,0,.45)",
    animation: "slideUp .3s ease",
  };

  // ── iOS: step-by-step manual install guide ────────────────────────────────
  if (iosMode) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-dialog-title"
        style={{ ...bannerBase, padding: "14px 16px" }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/images/ump-icon.svg"
              alt=""
              style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}
            />
            <div id="install-dialog-title" style={{ fontWeight: 700, fontSize: "1.35rem" }}>
              Install UMP
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,.5)", cursor: "pointer",
              fontSize: "1.4rem", padding: "4px 8px",
              fontFamily: "var(--font-sans)",
            }}
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Instruction sentence */}
        <p style={{ margin: "0 0 12px", fontSize: "1.2rem", color: "rgba(255,255,255,.8)", lineHeight: 1.5 }}>
          In Safari, tap the{" "}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(255,255,255,.12)", borderRadius: 6, padding: "2px 7px",
          }}>
            <i className="fas fa-arrow-up-from-bracket" aria-hidden="true" style={{ fontSize: "1rem" }} />
            <span>Share</span>
          </span>
          {" "}button, then tap{" "}
          <strong style={{ color: "#fff" }}>Add to Home Screen</strong>.
        </p>

        {/* Visual step chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { icon: "fas fa-arrow-up-from-bracket", label: "Share" },
            null,
            { icon: "fas fa-plus", label: "Add to Home Screen" },
          ].map((step, i) =>
            step ? (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,.08)", borderRadius: 8,
                  padding: "6px 10px", fontSize: "1.1rem", color: "rgba(255,255,255,.75)",
                }}
              >
                <i className={step.icon} aria-hidden="true" style={{ color: "#f97316" }} />
                <span>{step.label}</span>
              </div>
            ) : (
              <i key={i} className="fas fa-chevron-right" aria-hidden="true"
                style={{ color: "rgba(255,255,255,.3)", fontSize: "1rem" }} />
            )
          )}
        </div>
      </div>
    );
  }

  // ── Android / Desktop: native one-tap install ─────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-dialog-title"
      style={{ ...bannerBase, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
    >
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <img
        src="/images/ump-icon.svg"
        alt=""
        style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div id="install-dialog-title" style={{ fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.3 }}>
          Install UMP
        </div>
        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.65)", marginTop: 2 }}>
          Add to home screen for faster access
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,.2)",
            color: "rgba(255,255,255,.7)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "1.15rem",
            fontFamily: "var(--font-sans)",
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          disabled={installing}
          aria-busy={installing}
          aria-label={installing ? "Installing…" : "Install UMP"}
          style={{
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: "1.25rem",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {installing ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : "Install"}
        </button>
      </div>
    </div>
  );
}
