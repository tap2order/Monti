const KEY = "staff_auth";

export function setStaffToken(token) {
  if (token) localStorage.setItem(KEY, token);
  else clearStaffToken();
}

export function getStaffToken() {
  const token = localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
  if (!token) return "";
  try {
    const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded));
    if (payload.role !== "staff" || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      clearStaffToken();
      return "";
    }
  } catch {
    clearStaffToken();
    return "";
  }
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, token);
    sessionStorage.removeItem(KEY);
  }
  return token;
}

export function clearStaffToken() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export function getStaffAuth() {
  const token = getStaffToken();
  return token ? `Bearer ${token}` : "";
}

export function staffHeaders(headers = {}) {
  const token = getStaffToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
