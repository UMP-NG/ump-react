import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none" }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: "auto",
              minWidth: 240,
              maxWidth: "90vw",
              padding: "12px 18px",
              borderRadius: "var(--r-lg)",
              fontFamily: "var(--font)",
              fontSize: "1.4rem",
              fontWeight: 600,
              color: "#fff",
              boxShadow: "var(--shadow-pop)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "toast-in .22s ease",
              background:
                t.type === "success" ? "#16a34a" :
                t.type === "error"   ? "#dc2626" :
                t.type === "warn"    ? "#d97706" :
                "var(--navy-800)",
            }}
          >
            <i className={
              t.type === "success" ? "fas fa-circle-check" :
              t.type === "error"   ? "fas fa-circle-xmark" :
              t.type === "warn"    ? "fas fa-triangle-exclamation" :
              "fas fa-circle-info"
            } />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.showToast;
}
