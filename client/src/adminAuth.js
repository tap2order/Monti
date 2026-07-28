const KEY = "admin_auth";

export function setAdminAuth(token) {
  if (token) sessionStorage.setItem(KEY, token);
  else sessionStorage.removeItem(KEY);
}

export function getAdminAuth() {
  const token = getAdminToken();
  return token ? `Bearer ${token}` : "";
}

export function getAdminToken() {
  return sessionStorage.getItem(KEY) || "";
}

export function clearAdminAuth() {
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
