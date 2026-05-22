// src/utils/api.js

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ump-html-1.onrender.com");

// -------------------------------
// JWT storage (Authorization header fallback)
// Supplements the httpOnly cookie for environments where cross-origin
// cookies are blocked (third-party cookie restrictions, some mobile browsers).
// -------------------------------
const TOKEN_KEY = "ump_tk";
export const setToken   = (t) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); } catch {} };
export const getToken   = ()    => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const clearToken = ()    => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

// -------------------------------
// Cookie helpers
// -------------------------------
export function cookieSet(name, value, days = 1) {
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
}

export function cookieGet(name) {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function cookieRemove(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// -------------------------------
// API fetch helper
// -------------------------------
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Attach stored JWT as Authorization header fallback (complements httpOnly cookie)
  const stored = getToken();
  if (stored && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${stored}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
      body:
        options.body && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      if (res.status === 401) {
        clearToken();
        const err = new Error("Session expired. Please log in again.");
        err.status = 401;
        err.body = data;
        throw err;
      }
      const err = new Error(data?.message || res.statusText || "Request failed");
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err?.status !== 401) console.error("❌ API Fetch Error:", err);
    throw err;
  }
}

// -------------------------------
// Load current user profile
// -------------------------------
export async function loadUserProfile() {
  try {
    const data = await apiFetch("/api/auth/me");
    return data?.user || data || null;
  } catch {
    return null;
  }
}
