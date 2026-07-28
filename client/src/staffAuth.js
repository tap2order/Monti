const KEY = "staff_auth";

export function setStaffToken(token) {
  if (token) sessionStorage.setItem(KEY, token);
  else sessionStorage.removeItem(KEY);
}

export function getStaffToken() {
  return sessionStorage.getItem(KEY) || "";
}

export function clearStaffToken() {
  sessionStorage.removeItem(KEY);
}

export function staffHeaders(headers = {}) {
  const token = getStaffToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
