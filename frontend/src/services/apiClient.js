/**
 * Client HTTP (API)
 * - Construit l'URL à partir de VITE_API_BASE_URL
 * - Ajoute le token Bearer si présent
 * - Normalise les erreurs (status + data)
 * - Auto-refresh sur 401 (1 retry) via /auth/refresh (cookie httpOnly)
 *
 * Note : ne force pas Content-Type si FormData (uploads).
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

import { getToken, setToken, clearToken } from "./auth.storage.js";

/**
 * Construit l'URL complète de l'API.
 * @param {string} path Chemin API (ex: "/orders/active")
 * @returns {string}
 */
export function apiUrl(path) {
  return `${base}${path}`;
}

/**
 * Construit une erreur enrichie (status + data).
 * @param {Response} res Réponse fetch
 * @param {any} data Corps JSON parsé (si disponible)
 * @returns {Error}
 */
function buildHttpError(res, data) {
  const err = new Error(data?.error || "Erreur API");
  err.status = res.status;
  err.data = data;
  return err;
}

// Verrou : si plusieurs requêtes prennent 401 en même temps, un seul refresh est déclenché.
let refreshInFlight = null;

function isAuthEndpoint(path) {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout")
  );
}

async function doFetch(path, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    // IMPORTANT: nécessaire pour envoyer/recevoir le cookie refresh_token
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw buildHttpError(res, data);
  return data;
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    // Refresh via cookie httpOnly (pas de token dans le body).
    const res = await doFetch("/auth/refresh", {
      method: "POST",
    });

    const newAccess = res?.token;
    if (!newAccess) throw new Error("Refresh réussi mais token manquant.");

    setToken(newAccess);
    return newAccess;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Exécute une requête API (JSON) avec gestion d'erreurs.
 * - Parse JSON
 * - Throw enrichi si non-OK
 * - Auto-refresh sur 401 (1 retry) hors endpoints auth
 * @param {string} path Chemin API
 * @param {object} [options] Options fetch
 * @returns {Promise<any>}
 */
export async function apiFetch(path, options = {}) {
  try {
    return await doFetch(path, options);
  } catch (err) {
    const status = err?.status;

    // Si 401 et pas un endpoint auth => refresh + retry 1 fois
    if (status === 401 && !isAuthEndpoint(path)) {
      try {
        await refreshAccessToken();
        // retry 1 fois
        return await doFetch(path, options);
      } catch (e) {
        // refresh raté => on nettoie la session locale
        clearToken?.();
        throw e;
      }
    }

    throw err;
  }
}
