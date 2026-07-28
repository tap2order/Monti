const SESSION_ERRORS = new Set([
  "ROOM_SESSION_REQUIRED",
  "ROOM_VERIFICATION_REQUIRED",
  "ROOM_SESSION_EXPIRED",
  "ROOM_SESSION_REVOKED",
]);

export function isRoomSessionError(code) {
  return SESSION_ERRORS.has(code);
}

export function lockRoomSession(code = "ROOM_SESSION_EXPIRED") {
  window.dispatchEvent(new CustomEvent("guest-room-session-invalid", { detail: { code } }));
}
