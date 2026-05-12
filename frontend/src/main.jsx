import React from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from "./context/ToastContext";
import { WishlistProvider } from "./context/WishlistContext";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <UserProvider>
      <ToastProvider>
        <WishlistProvider>
          <App />
        </WishlistProvider>
      </ToastProvider>
    </UserProvider>
  </BrowserRouter>
);
