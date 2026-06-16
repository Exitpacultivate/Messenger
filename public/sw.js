// Service Worker: офлайн-кэш оболочки + показ фоновых уведомлений
const CACHE = "msgr-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

// Сообщение из приложения → показать уведомление (работает, пока вкладка в фоне)
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "notify") {
    self.registration.showNotification(d.title || "Новое сообщение", {
      body: d.body || "", tag: d.tag || "msg", icon: "/favicon.svg", data: { chatId: d.tag },
    });
  }
});

// Клик по уведомлению → фокус на вкладку
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow("/");
  }));
});

// Внешний push (если подключён OneSignal/FCM, придёт сюда)
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: "Новое сообщение", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Мессенджер", {
    body: d.body || "", icon: "/favicon.svg", tag: d.tag || "push",
  }));
});
