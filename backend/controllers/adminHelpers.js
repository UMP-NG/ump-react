// Shared utilities for admin domain controllers

// ── In-process response cache ────────────────────────────────────────────────
const _sCache = new Map();
const CACHE_MAX = 200; // evict oldest entry when limit reached to prevent unbounded growth

export function scGet(key, ttlMs) {
  const e = _sCache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data;
  return null;
}
export function scSet(key, data) {
  if (_sCache.size >= CACHE_MAX) _sCache.delete(_sCache.keys().next().value);
  _sCache.set(key, { data, ts: Date.now() });
}

// ── Currency formatter ───────────────────────────────────────────────────────
export const fmt = (n) => {
  if (!n || isNaN(n)) return "₦0";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(1)}K`;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
};

// ── Date helpers ─────────────────────────────────────────────────────────────
export const startOf = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── Seller status ─────────────────────────────────────────────────────────────
export const sellerStatus = (s) => {
  if (s.isSuspended)  return "suspended";
  if (s.isSubscribed) return "subscribed";
  return "pending";
};
