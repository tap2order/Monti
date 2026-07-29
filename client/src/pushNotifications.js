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

export async function getPushState() {
  if (!pushIsSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.register("/push-service-worker.js");
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "disabled";
}

export async function enableAdminPush(api) {
  if (!pushIsSupported()) throw new Error("Ovaj browser ne podržava push notifikacije.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Dozvola za notifikacije nije odobrena.");

  const registration = await navigator.serviceWorker.register("/push-service-worker.js");
  const keyResponse = await adminFetch(`${api}/api/admin/push/public-key`);
  if (!keyResponse.ok) throw new Error("Push notifikacije nisu podešene na serveru.");
  const { publicKey } = await keyResponse.json();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const response = await adminFetch(`${api}/api/admin/push/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error("Uređaj nije moguće registrovati za notifikacije.");
}

export async function disableAdminPush(api) {
  if (!pushIsSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration("/push-service-worker.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await adminFetch(`${api}/api/admin/push/subscriptions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
