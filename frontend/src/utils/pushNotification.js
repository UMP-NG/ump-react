import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { app } from "../config/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function isPushSupported() {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;
}

let _messaging = null;
function getFirebaseMessaging() {
  if (!_messaging) _messaging = getMessaging(app);
  return _messaging;
}

export async function requestPushPermission() {
  if (!isPushSupported()) throw new Error("Push notifications are not supported in this browser");
  if (!VAPID_KEY) throw new Error("Push notifications are not configured. Add VITE_FIREBASE_VAPID_KEY to your .env file.");

  const permission = await Notification.requestPermission();
  if (permission === "denied") throw new Error("Notification permission denied. Enable it in your browser settings and try again.");
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  try {
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch (swErr) {
    throw new Error(`Service worker registration failed: ${swErr.message}`);
  }
  const messaging = getFirebaseMessaging();
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) throw new Error("Failed to get push token. Ensure the app is served over HTTPS.");
  return token;
}

export async function disablePushNotifications() {
  if (!isPushSupported()) return;
  try {
    const messaging = getFirebaseMessaging();
    await deleteToken(messaging);
  } catch {
    // Ignore — token may already be gone
  }
}
