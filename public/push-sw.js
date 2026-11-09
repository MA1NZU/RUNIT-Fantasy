/*
 * RUNIT Fantasy — push notification service worker.
 *
 * The browser keeps this file running in the background. When the send
 * route ( /api/push ) delivers a Web Push message, this worker shows it
 * as a system notification — even when the site is closed. Tapping the
 * notification opens (or focuses) the site on the page the admin picked.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "RUNIT Fantasy";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [80, 40, 80],
    data: { url: data.url || "/" },
  };

  if (data.tag) options.tag = data.tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.registration.scope)) {
            if (typeof client.navigate === "function") {
              return client
                .navigate(url)
                .then((navigated) =>
                  navigated ? navigated.focus() : self.clients.openWindow(url)
                )
                .catch(() => client.focus());
            }

            return client.focus();
          }
        }

        return self.clients.openWindow(url);
      })
  );
});
