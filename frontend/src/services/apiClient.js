/**
 * Client HTTP minimal :
 * - Construit l'URL API à partir de VITE_API_BASE_URL
 * - Normalise les erreurs (throw Error avec status + data)
 *
 * Ne définit pas Content-Type automatiquement pour ne pas casser les uploads FormData.
 */
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
  const res = await fetch(apiUrl(path), options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Erreur API");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
