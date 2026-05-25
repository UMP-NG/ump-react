// UMP Service Worker — handles Web Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); } catch { data = { title: "UMP", body: event.data.text() }; }

  const title   = data.title || "UMP";
  const options = {
    body:    data.body  || "",
    icon:    data.icon  || "/images/ump-icon.svg",
    badge:   data.badge || "/images/ump-icon.svg",
    tag:     data.tag   || "ump-broadcast",
    renotify: true,
    data:    { url: data.url || "/" },
    actions: data.url
      ? [{ action: "open", title: "View" }]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicking the notification opens the app at the right URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Activate immediately — don't wait for old tabs to close
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
