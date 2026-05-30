// UMP uses Firebase Auth only — Firebase Cloud Messaging is NOT used.
// This file is kept to prevent 404s from any cached references to it,
// but it does NOT initialise Firebase Messaging so it cannot intercept
// push events that belong to the main UMP service worker (sw.js).
//
// Chrome on Android routes all push messages through FCM. If Firebase Messaging
// were initialised here it would intercept those messages BEFORE sw.js, causing
// push notifications to silently fail on Android phones.
