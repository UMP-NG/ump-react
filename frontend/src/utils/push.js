import { apiFetch } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Wait for a specific ServiceWorkerRegistration to have an active worker.
// navigator.serviceWorker.ready resolves with whatever SW is already controlling
// the page — that might be an old or different SW. This waits for OUR registration.
function waitForActive(reg) {
  if (reg.active) return Promise.resolve(reg.active);
  return new Promise((resolve) => {
    const worker = reg.installing || reg.waiting;
    if (!worker) { resolve(null); return; }
    worker.addEventListener("statechange", function handler() {
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", handler);
        resolve(worker);
      }
    });
  });
}

/**
 * Register the service worker, ask notification permission, subscribe to
 * Web Push, and save the subscription to the backend.
 *
 * Returns "granted" | "denied" | "unsupported" | "error"
 */
export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  // iOS Safari only supports Web Push inside a home-screen PWA (iOS 16.4+).
  // Outside a PWA, Notification is defined but requestPermission always returns "denied".
  // Detect this early so we don't waste a subscription attempt.
  if (
    /iP(hone|od|ad)/.test(navigator.userAgent) &&
    !window.navigator.standalone
  ) {
    return "unsupported";
  }

  try {
    // 1. Register OUR service worker (idempotent — safe to call every login)
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Wait for THIS registration to be active, not just any controlling SW.
    // Using navigator.serviceWorker.ready here would return a stale registration
    // if a different SW (e.g. firebase-messaging-sw.js) was previously controlling.
    const activeWorker = await waitForActive(reg);
    if (!activeWorker) return "error"; // SW failed to activate — no push possible

    // 2. Get VAPID public key from server (returns "unsupported" silently if server has no VAPID keys)
    let keyData;
    try {
      keyData = await apiFetch("/api/push/vapid-key");
    } catch (err) {
      if (err?.status === 503 || err?.status === 404) return "unsupported";
      throw err;
    }
    const key = keyData?.key;
    if (!key) return "unsupported";

    // 3. Ask permission (no-op if already granted/denied)
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";

    // 4. Subscribe (or refresh if the stored subscription belongs to a different VAPID key)
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Compare stored key against current VAPID key — mismatch means the backend
      // regenerated its keys and this subscription will always 401 on delivery
      const storedKey = sub.options?.applicationServerKey;
      const currentKey = urlBase64ToUint8Array(key);
      let keyMismatch = false;
      if (storedKey) {
        const stored = new Uint8Array(storedKey);
        keyMismatch = stored.length !== currentKey.length ||
          stored.some((b, i) => b !== currentKey[i]);
      }
      if (keyMismatch) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    // 5. Send subscription to backend
    const subJson = sub.toJSON();
    await apiFetch("/api/push/subscribe", {
      method: "POST",
      body: { endpoint: subJson.endpoint, keys: subJson.keys },
    });

    return "granted";
  } catch (err) {
    if (err?.status !== 503) console.error("subscribeToPush:", err);
    return "error";
  }
}

/** Remove this browser's push subscription from the backend. */
export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await apiFetch("/api/push/unsubscribe", {
        method: "DELETE",
        body: { endpoint: sub.endpoint },
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}
