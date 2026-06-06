import React from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from "./context/ToastContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";

// Initialise Sentry only when VITE_SENTRY_DSN is set in your .env.
// Leave the variable unset in development to avoid noise in local logs.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    environment:      import.meta.env.MODE,
    tracesSampleRate: 0.2,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend(event) {
      // Drop events from known crawlers and bots — they fail service worker
      // registration and other browser APIs, producing noise with 0 real users.
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      if (/bot|crawler|spider|googlebot|read.aloud|facebookexternalhit|slurp|bingbot/i.test(ua)) {
        return null;
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <UserProvider>
      <ToastProvider>
        <WishlistProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </WishlistProvider>
      </ToastProvider>
    </UserProvider>
  </BrowserRouter>
);
