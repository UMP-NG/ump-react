// src/utils/api.js
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ump-html-1.onrender.com");

/**
 * apiFetch - helper for backend requests
 * @param {string} endpoint - API path starting with /
 * @param {object} options - { method, headers, body }
 * @returns {Promise<any>} JSON response
 */
export async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // send httpOnly cookie if needed
    body: options.body ? JSON.stringify(options.body) : null,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
}
