self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: "Tap2Order Monti", body: event.data?.text() || "Nova obavijest" };
  }

  event.waitUntil(self.registration.showNotification(data.title || "Tap2Order Monti", {
    body: data.body || "",
    icon: "/monti-logo.png",
    badge: "/monti-logo.png",
    tag: data.tag,
    renotify: true,
    data: { url: data.url || "/waiter" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/waiter", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
