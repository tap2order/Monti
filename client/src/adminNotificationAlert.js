const DEFAULT_TITLE = "Hotel Monti";
const ALERT_TITLE = "🔔 Nova obavijest";
const ALERT_ICON = "data:image/svg+xml," + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="30" fill="#e5484d"/>
    <path fill="#fff" d="M32 12c-7 0-12 5-12 12v9l-5 8v3h34v-3l-5-8v-9c0-7-5-12-12-12Zm0 40a6 6 0 0 0 6-5H26a6 6 0 0 0 6 5Z"/>
  </svg>
`);
const sounds = typeof Audio === "undefined" ? {} : {
  order: new Audio("/sounds/new-order.mp3"),
  call: new Audio("/sounds/new-call.mp3"),
};

const notifiedIds = new Map();
let titleBeforeAlert = DEFAULT_TITLE;
let iconBeforeAlert = null;
let iconLink = null;
let flashTimer = null;
let flashing = false;

function getIconLink() {
  const current = document.querySelector("link[rel~='icon']");
  if (current) return current;

  const created = document.createElement("link");
  created.rel = "icon";
  document.head.appendChild(created);
  return created;
}

function stopTabAlert() {
  if (flashTimer) window.clearInterval(flashTimer);
  flashTimer = null;
  flashing = false;
  document.title = titleBeforeAlert;
  if (iconLink && iconBeforeAlert !== null) iconLink.href = iconBeforeAlert;
}

function startTabAlert() {
  if (flashing) return;
  flashing = true;
  titleBeforeAlert = document.title || DEFAULT_TITLE;
  iconLink = getIconLink();
  iconBeforeAlert = iconLink.getAttribute("href") || "/monti-logo.png";

  let highlighted = false;
  const flash = () => {
    highlighted = !highlighted;
    document.title = highlighted ? ALERT_TITLE : titleBeforeAlert;
    iconLink.href = highlighted ? ALERT_ICON : iconBeforeAlert;
  };
  flash();
  flashTimer = window.setInterval(flash, 900);
}

function playSound(type) {
  const audio = sounds[type === "call" ? "call" : "order"];
  if (!audio) return;
  audio.volume = 0.8;
  audio.muted = false;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Browsers can block sound until the admin has interacted with the page.
  });
}

export function unlockAdminNotificationSound() {
  Object.values(sounds).forEach((audio) => {
    audio.muted = true;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {});
  });
}

export function announceAdminNotification({ id, type = "order" } = {}) {
  const notificationId = id || `${type}-${Date.now()}`;
  const now = Date.now();
  const previous = notifiedIds.get(notificationId);
  if (previous && now - previous < 15_000) return;

  notifiedIds.set(notificationId, now);
  for (const [storedId, timestamp] of notifiedIds) {
    if (now - timestamp > 60_000) notifiedIds.delete(storedId);
  }

  playSound(type);
  startTabAlert();
}

export function clearAdminNotificationAlert() {
  stopTabAlert();
}
