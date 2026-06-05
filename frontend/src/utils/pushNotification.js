export function isPushSupported() {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;
}
