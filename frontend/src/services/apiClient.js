/**
 * Client HTTP minimal :
 * - Construit l'URL API à partir de VITE_API_BASE_URL
 * - Normalise les erreurs (throw Error avec status + data)
 * - Auto-refresh sur 401 (1 fois) via cookie httpOnly /auth/refresh
 *
 * Ne définit pas Content-Type automatiquement pour ne pas casser les uploads FormData.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

import { getToken, setToken, clearToken } from "./auth.storage.js";

/** Construit l'URL complète de l'API. */
export function apiUrl(path) {
  return `${base}${path}`;
}

/** Erreur enrichie */
function buildHttpError(res, data) {
  const err = new Error(data?.error || "Erreur API");
  err.status = res.status;
  err.data = data;
  return err;
}

// Verrou: si plusieurs requêtes prennent 401 en même temps => 1 seul refresh
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
    // appel direct /auth/refresh (cookie httpOnly)
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
 * Wrapper fetch:
 * - parse JSON
 * - throw enrichi si non-OK
 * - auto refresh + retry 1 fois sur 401
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
