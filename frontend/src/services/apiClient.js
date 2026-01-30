/**
 * @file frontend/src/services/apiClient.js
 * @description Client HTTP : base URL, Bearer token, normalisation erreurs, auto-refresh 401 (1 retry).
 */
// Ne force pas Content-Type quand body est un FormData (upload).

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
 * Centralise le format d'erreur pour simplifier la gestion côté UI.
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

// Lock refresh : mutualise le refresh si plusieurs requêtes tombent en 401.
let refreshInFlight = null;

/**
 * Identifie les endpoints d'auth (à exclure du mécanisme refresh/retry).
 * @param {string} path
 * @returns {boolean}
 */
function isAuthEndpoint(path) {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout")
  );
}

/**
 * Exécute un fetch JSON (sauf FormData) avec Bearer token + cookies (refresh).
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
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
    // Nécessaire pour envoyer/recevoir le cookie de refresh.
    credentials: "include",
    signal: options.signal,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw buildHttpError(res, data);
  return data;
}

/**
 * Rafraîchit le token d'accès via /auth/refresh (cookie httpOnly).
 * Mutualisé via refreshInFlight.
 * @returns {Promise<string>} nouveau token d'accès
 */
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
 * Exécute une requête API avec normalisation des erreurs et auto-refresh sur 401 (1 retry) hors endpoints d'auth.
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
