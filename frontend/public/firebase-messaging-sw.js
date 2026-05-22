importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyA0ddvrH47Dtt6DQqbv5AVYvbQ2itSotes",
  authDomain:        "ump-official-910fb.firebaseapp.com",
  projectId:         "ump-official-910fb",
  storageBucket:     "ump-official-910fb.firebasestorage.app",
  messagingSenderId: "683405618554",
  appId:             "1:683405618554:web:cb82f148efa324eb2cbac3",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = "UMP", body = "", icon } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data || {},
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
