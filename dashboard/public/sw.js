// Bullia Push Notification Service Worker
// Handles incoming push events and notification click actions.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bullia", body: event.data.text(), url: "/" };
  }

  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
    // vibrate only on Android; iOS ignores it silently
    vibrate: [150, 50, 150],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Bullia Alert", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const url = event.notification.data?.url || "/";
        // If a window is already open, focus it and navigate
        for (const client of windowClients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
