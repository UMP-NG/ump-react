// src/utils/api.js

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ump-html-1.onrender.com");

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
  const headers = options.headers || {};
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include", // include cookies automatically
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
      const err = new Error(
        data?.message || res.statusText || "Request failed"
      );
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
