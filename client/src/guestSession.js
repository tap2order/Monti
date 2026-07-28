const API_BASE = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function guestApiUrl(path) {
  return `${API_BASE}${path}`;
}

export function notifyGuestSessionError(payload) {
  if (payload?.code === "ROOM_SESSION_EXPIRED" || payload?.code === "ROOM_SESSION_REQUIRED" || payload?.code === "ROOM_VERIFICATION_REQUIRED" || payload?.code === "ROOM_SESSION_REVOKED") {
    window.dispatchEvent(new CustomEvent("guest-room-session-invalid", { detail: payload }));
  }
}

export async function guestFetch(path, options = {}) {
  const response = await fetch(guestApiUrl(path), { credentials: "include", ...options });
  if (!response.ok) {
    let payload = null;
    try { payload = await response.clone().json(); } catch { /* non-JSON error */ }
    notifyGuestSessionError(payload);
  }
  return response;
}

export async function guestJson(response) {
  try { return await response.json(); } catch { return null; }
}

// A successful Set-Cookie response is not proof that a browser kept the cookie
// (notably on restrictive Safari/iOS settings). Confirm every transition with
// the server before protected UI is allowed to render.
export async function confirmGuestRoomSession() {
  const response = await guestFetch("/api/guest/room-session", { cache: "no-store" });
  return { response, payload: await guestJson(response) };
}
