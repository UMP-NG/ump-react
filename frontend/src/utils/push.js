import { apiFetch } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
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

  try {
    // 1. Register the service worker (idempotent — safe to call every login)
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

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

    // 4. Subscribe (or get existing subscription)
    let sub = await reg.pushManager.getSubscription();
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
  } catch {}
}
