export const CAMERA_CONSTRAINTS = Object.freeze({
  video: { facingMode: { ideal: "environment" } },
  audio: false,
});

export const CAMERA_FALLBACK_CONSTRAINTS = Object.freeze({
  video: true,
  audio: false,
});

export function cameraErrorKind(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "not_found";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "in_use";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "overconstrained";
    default:
      return "unavailable";
  }
}

export async function queryCameraPermission(navigatorObject = navigator) {
  try {
    if (!navigatorObject.permissions?.query) return "unknown";
    const result = await navigatorObject.permissions.query({ name: "camera" });
    return ["granted", "prompt", "denied"].includes(result?.state) ? result.state : "unknown";
  } catch {
    return "unknown";
  }
}

export function cameraGuideKind(userAgent = "") {
  const ua = String(userAgent);
  const ios = /iPad|iPhone|iPod/i.test(ua);
  if (ios && /CriOS/i.test(ua)) return "chrome_ios";
  if (ios && /Safari/i.test(ua) && !/FxiOS|EdgiOS|OPiOS/i.test(ua)) return "safari_ios";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  if (/Edg|EdgiOS|EdgA/i.test(ua)) return "edge";
  if (/Android/i.test(ua) && /SamsungBrowser|Brave|OPR|Opera/i.test(ua)) return "android_alt";
  if (/Android/i.test(ua) && /Chrome|CriOS/i.test(ua)) return "chrome_android";
  return "generic";
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}
