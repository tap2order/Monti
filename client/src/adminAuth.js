const KEY = "admin_auth";

export function setAdminAuth(token) {
  if (token) localStorage.setItem(KEY, token);
  else clearAdminAuth();
}

export function getAdminAuth() {
  const token = getAdminToken();
  return token ? `Bearer ${token}` : "";
}

export function getAdminToken() {
  const token = localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
  if (!token) return "";
  try {
    const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      clearAdminAuth();
      return "";
    }
  } catch {
    clearAdminAuth();
    return "";
  }
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, token);
    sessionStorage.removeItem(KEY);
  }
  return token;
}

export function clearAdminAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export function isAdminLoggedIn() {
  return Boolean(getAdminAuth());
}

export function adminFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: getAdminAuth() },
  });
}
