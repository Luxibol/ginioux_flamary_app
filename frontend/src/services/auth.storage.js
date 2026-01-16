const KEY = "gf_auth_v1";

function getStore(kind) {
  if (typeof window === "undefined") return null;
  return kind === "session" ? window.sessionStorage : window.localStorage;
}

export function getAuth() {
  try {
    // Priorité localStorage, fallback sessionStorage
    const local = getStore("local")?.getItem(KEY);
    if (local) return JSON.parse(local);

    const session = getStore("session")?.getItem(KEY);
    if (session) return JSON.parse(session);

    return null;
  } catch {
    return null;
  }
}

export function setAuth(payload, { persist = "local" } = {}) {
  clearAuth();
  getStore(persist)?.setItem(KEY, JSON.stringify(payload));
}

export function clearAuth() {
  getStore("local")?.removeItem(KEY);
  getStore("session")?.removeItem(KEY);
}

export function getToken() {
  return getAuth()?.token || null;
}

export function getUser() {
  return getAuth()?.user || null;
}
