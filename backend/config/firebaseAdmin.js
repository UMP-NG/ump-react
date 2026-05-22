import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

// ─────────────────────────────────────────────────────────────────────────────
// Fill these in your backend .env file (copy values from Firebase Console →
// Project Settings → Service accounts → Generate new private key)
//
// FIREBASE_PROJECT_ID   = your-project-id
// FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
// FIREBASE_PRIVATE_KEY  = -----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
//   (paste the full private key from the JSON file, keep the \n characters)
// ─────────────────────────────────────────────────────────────────────────────

let _auth = null;

export function getFirebaseAuth() {
  if (_auth) return _auth;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  _auth = getAuth();
  return _auth;
}

export async function sendPushNotification(fcmToken, { title, body, data = {} }) {
  if (!fcmToken) return;
  const messaging = getFirebaseAuth() ? getMessaging() : null;
  if (!messaging) return;
  try {
    const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
    await messaging.send({ token: fcmToken, notification: { title, body }, data: stringData });
  } catch (err) {
    if (err?.code !== "messaging/registration-token-not-registered") {
      console.error("FCM send error:", err.message);
    }
  }
}
