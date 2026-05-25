// src/utils/api.js

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://ump-html-1.onrender.com");

// ── JWT helpers ──────────────────────────────────────────────────────────────
const TOKEN_KEY = "ump_tk";
export const setToken   = (t) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); } catch {} };
export const getToken   = ()    => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const clearToken = ()    => { try { localStorage.removeItem(TOKEN_KEY); } catch {} };

// ── Cookie helpers ───────────────────────────────────────────────────────────
export function cookieSet(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
export function cookieGet(name) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
export function cookieRemove(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ── Response cache ───────────────────────────────────────────────────────────
// Two tiers:
//   1. In-memory Map  — instant, reset on page reload
//   2. sessionStorage — survives page reload, cleared when tab closes
//
// TTL strategy: return stale data immediately + background-refresh (SWR pattern).
// Any mutation (POST/PUT/DELETE) to /api/admins/* nukes all admin cache entries.

const _mem = new Map();
const MEM_MAX = 150; // max entries before evicting oldest

const CACHE_TTLS = {
  "/api/admins/stats":          60_000,   // 60 s  — heavy aggregation
  "/api/admins/activity-chart": 120_000,  // 2 min — chart aggregation
  "/api/admins/analytics":      180_000,  // 3 min — analytics aggregation
  "/api/auth/me":               300_000,  // 5 min — user profile
};
const DEFAULT_TTL = 30_000; // 30 s for all list endpoints

function _ttl(path) {
  for (const [prefix, ms] of Object.entries(CACHE_TTLS)) {
    if (path.startsWith(prefix)) return ms;
  }
  return DEFAULT_TTL;
}

function _ssKey(path) { return `_ac:${path}`; }

function _read(path) {
  // 1. Try in-memory first
  const mem = _mem.get(path);
  if (mem) {
    const age = Date.now() - mem.ts;
    if (age < mem.ttl * 2) return { data: mem.data, stale: age > mem.ttl };
    _mem.delete(path);
  }
  // 2. Fall back to sessionStorage (survives reload)
  try {
    const raw = sessionStorage.getItem(_ssKey(path));
    if (raw) {
      const entry = JSON.parse(raw);
      const age   = Date.now() - entry.ts;
      if (age < entry.ttl * 2) {
        _mem.set(path, entry); // restore to memory
        return { data: entry.data, stale: age > entry.ttl };
      }
      sessionStorage.removeItem(_ssKey(path));
    }
  } catch {}
  return null;
}

function _write(path, data) {
  const entry = { data, ts: Date.now(), ttl: _ttl(path) };
  _mem.delete(path); // re-insert at end to maintain LRU order
  _mem.set(path, entry);
  // Evict oldest entry when over limit
  if (_mem.size > MEM_MAX) _mem.delete(_mem.keys().next().value);
  try { sessionStorage.setItem(_ssKey(path), JSON.stringify(entry)); } catch {}
}

function _invalidate(prefix) {
  for (const key of [..._mem.keys()]) {
    if (key.startsWith(prefix)) _mem.delete(key);
  }
  try {
    const toRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(`_ac:${prefix}`)) toRemove.push(k);
    }
    toRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

// Call this after a mutation to force-fresh the next GET (pages call fetchUsers() etc.)
export function bustCache(prefix = "/api/admins") { _invalidate(prefix); }

// ── Core network fetch (no cache) ────────────────────────────────────────────
async function _doFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const stored = getToken();
  if (stored && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${stored}`;
  }

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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent("auth:logout"));
      const err = new Error("Session expired. Please log in again.");
      err.status = 401;
      err.body   = data;
      throw err;
    }
    const err = new Error(data?.message || res.statusText || "Request failed");
    err.status = res.status;
    err.body   = data;
    throw err;
  }

  return data;
}

// ── Public apiFetch with caching ─────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  if (method === "GET") {
    const hit = _read(path);
    if (hit) {
      if (!hit.stale) return hit.data; // fresh — return immediately
      // Stale-while-revalidate: return cached now, refresh silently in background
      _doFetch(path, options).then(d => _write(path, d)).catch(() => {});
      return hit.data;
    }
  } else {
    // Any write operation: flush all admin caches so the next GET is always fresh
    _invalidate("/api/admins");
  }

  try {
    const data = await _doFetch(path, options);
    if (method === "GET") _write(path, data);
    return data;
  } catch (err) {
    if (err?.status !== 401 && err?.status !== 503) console.error("❌ API Error:", err);
    throw err;
  }
}

// ── Load current user profile ────────────────────────────────────────────────
export async function loadUserProfile() {
  try {
    const data = await apiFetch("/api/auth/me");
    return data?.user || data || null;
  } catch {
    return null;
  }
}
