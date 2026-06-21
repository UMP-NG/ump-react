// Lightweight in-memory TTL cache for server-side response caching.
// Automatically evicts expired entries and caps total size to avoid OOM.
// Usage:
//   cacheGet("products:all")           → value or null
//   cacheSet("products:all", data, 30_000)
//   cacheDel("products:")               → deletes all keys with this prefix

const _store = new Map();
const MAX_ENTRIES = 1000;

function _prune() {
  const now = Date.now();
  for (const [k, v] of _store) {
    if (v.expiresAt < now) { _store.delete(k); break; }
  }
  if (_store.size >= MAX_ENTRIES) _store.delete(_store.keys().next().value);
}

export function cacheGet(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) { _store.delete(key); return null; }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 30_000) {
  _prune();
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Deletes all keys starting with prefix (pass full key to delete one entry)
export function cacheDel(prefix) {
  for (const k of _store.keys()) {
    if (k.startsWith(prefix)) _store.delete(k);
  }
}

export function cacheSize() {
  return _store.size;
}
