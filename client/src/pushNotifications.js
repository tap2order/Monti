import { adminFetch } from "./adminAuth";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function pushIsSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registerPushServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("/push-service-worker.js");
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    throw new Error("Service worker za notifikacije nije moguće pokrenuti. Osvježite stranicu i pokušajte ponovo.");
  }
}

export async function getPushState() {
  if (!window.isSecureContext) return "insecure";
  if (!pushIsSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await registerPushServiceWorker();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "disabled";
}

async function enablePush(api, path, authorization) {
  if (!window.isSecureContext) {
    throw new Error("Push notifikacije zahtijevaju HTTPS vezu. Otvorite sigurnu HTTPS adresu aplikacije.");
  }
  if (!pushIsSupported()) throw new Error("Ovaj browser ne podržava push notifikacije.");
  const permission = await Notification.requestPermission();
  if (permission === "denied") throw new Error("Notifikacije su blokirane u postavkama browsera.");
  if (permission !== "granted") throw new Error("Dozvola za notifikacije nije odobrena.");

  const registration = await registerPushServiceWorker();
  const request = authorization
    ? (url, options = {}) => fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: authorization },
      })
    : adminFetch;
  const keyResponse = await request(`${api}${path}/public-key`);
  if (!keyResponse.ok) {
    if (keyResponse.status === 503) {
      throw new Error("Push notifikacije nisu podešene na serveru. Nedostaju VAPID ključevi.");
    }
    throw new Error("Server nije mogao učitati postavke push notifikacija.");
  }
  const { publicKey } = await keyResponse.json();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch {
      throw new Error("Browser nije mogao kreirati push pretplatu. Provjerite dozvolu za notifikacije.");
    }
  }

  const response = await request(`${api}${path}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error("Uređaj nije moguće registrovati za notifikacije.");
}

async function disablePush(api, path, authorization) {
  if (!window.isSecureContext || !pushIsSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/push-service-worker.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const request = authorization
    ? (url, options = {}) => fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: authorization },
      })
    : adminFetch;
  await request(`${api}${path}/subscriptions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export function enableAdminPush(api) {
  return enablePush(api, "/api/admin/push");
}

export function disableAdminPush(api) {
  return disablePush(api, "/api/admin/push");
}

export function enableStaffPush(api, token) {
  return enablePush(api, "/api/staff/push", `Bearer ${token}`);
}

export function disableStaffPush(api, token) {
  return disablePush(api, "/api/staff/push", `Bearer ${token}`);
}
