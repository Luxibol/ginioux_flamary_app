/**
 * Client HTTP minimal :
 * - Construit l'URL API à partir de VITE_API_BASE_URL
 * - Normalise les erreurs (throw Error avec status + data)
 *
 * Ne définit pas Content-Type automatiquement pour ne pas casser les uploads FormData.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
import { getToken } from "./auth.storage.js";

/**
 * Construit l'URL complète de l'API.
 * @param {string} path Chemin API (ex: "/orders/active")
 * @returns {string} URL complète (base + path)
 */
export function apiUrl(path) {
  return `${base}${path}`;
}

/**
 * Wrapper fetch qui :
 * - parse la réponse JSON si possible
 * - lève une erreur si status HTTP non-OK (err.status, err.data)
 *
 * @param {string} path Chemin API (ex: "/orders/active")
 * @param {RequestInit} [options] Options fetch (method, headers, body...)
 * @returns {Promise<any>} JSON parsé (ou {} si pas de body)
 * @throws {Error & {status?:number, data?:any}} Erreur enrichie si HTTP != 2xx
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Ne pas forcer Content-Type si FormData
  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(apiUrl(path), { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Erreur API");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
