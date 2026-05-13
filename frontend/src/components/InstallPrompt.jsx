import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Hide once the app is actually installed
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
      // prompt rejected or unsupported — fall through to finally
    } finally {
      setInstalling(false);
      setPrompt(null);
      setShow(false); // close regardless of outcome
    }
  }

  function dismiss() {
    setShow(false);
    // Don't show again this session
    sessionStorage.setItem("pwa-dismissed", "1");
  }

  // Respect the user's "not now" for the rest of the session
  if (!show || sessionStorage.getItem("pwa-dismissed")) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-dialog-title"
      style={{
        position: "fixed",
        bottom: 72,
        left: 16,
        right: 16,
        zIndex: 1500,
        background: "#0f172a",
        color: "#fff",
        borderRadius: 18,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,.45)",
        animation: "slideUp .3s ease",
      }}
    >
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <img
        src="/images/ump-icon.svg"
        alt="UMP"
        style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div id="install-dialog-title" style={{ fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.3 }}>Install UMP</div>
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
