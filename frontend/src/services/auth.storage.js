/**
 * Auth (Storage)
 * - Stockage de la session (localStorage / sessionStorage)
 * - Accès helpers (getAuth, getToken, getUser)
 * - Mise à jour ciblée du token
 */
const KEY = "gf_auth_v1";

function getStore(kind) {
  if (typeof window === "undefined") return null;
  return kind === "session" ? window.sessionStorage : window.localStorage;
}

/**
 * Récupère la session stockée (priorité localStorage, fallback sessionStorage).
 * @returns {object|null}
 */
export function getAuth() {
  try {
    const local = getStore("local")?.getItem(KEY);
    if (local) return JSON.parse(local);

    const session = getStore("session")?.getItem(KEY);
    if (session) return JSON.parse(session);

    return null;
  } catch {
    return null;
  }
}

/**
 * Enregistre la session.
 * @param {object} payload Données de session (token, user, etc.)
 * @param {object} [options]
 * @param {"local"|"session"} [options.persist="local"] Où persister la session
 * @returns {void}
 */
export function setAuth(payload, { persist = "local" } = {}) {
  clearAuth();
  getStore(persist)?.setItem(KEY, JSON.stringify(payload));
}

/**
 * Supprime la session (local + session).
 * @returns {void}
 */
export function clearAuth() {
  getStore("local")?.removeItem(KEY);
  getStore("session")?.removeItem(KEY);
}

/**
 * Retourne le token courant si présent.
 * @returns {string|null}
 */
export function getToken() {
  return getAuth()?.token || null;
}

/**
 * Retourne l'utilisateur courant si présent.
 * @returns {object|null}
 */
export function getUser() {
  return getAuth()?.user || null;
}

/**
 * Met à jour le token dans le storage existant (local et/ou session).
 * @param {string} token Nouveau token
 * @returns {void}
 */
export function setToken(token) {
  const cur = getAuth();
  if (!cur) return;

  // Met à jour local/session si la session existe déjà dans l’un des deux.
  const next = { ...cur, token };

  const hasLocal = !!getStore("local")?.getItem(KEY);
  const hasSession = !!getStore("session")?.getItem(KEY);

  if (hasLocal) getStore("local")?.setItem(KEY, JSON.stringify(next));
  if (hasSession) getStore("session")?.setItem(KEY, JSON.stringify(next));
}

/**
 * Supprime le token (alias de clearAuth).
 * @returns {void}
 */
export function clearToken() {
  clearAuth();
}
