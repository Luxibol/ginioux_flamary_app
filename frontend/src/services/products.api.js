/**
 * Produits (API)
 * - Autocomplete produits (recherche par libellé PDF)
 * - Support AbortController (signal)
 * - Normalise le retour en tableau (depuis { data: [...] })
 */
import { apiFetch } from "./apiClient.js";

/**
 * Recherche des produits par libellé (autocomplete).
 * @param {string} q Terme de recherche
 * @param {number} [limit=10] Nombre max de résultats
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] Permet d'annuler la requête (AbortController)
 * @returns {Promise<any[]>}
 */
export async function searchProducts(q, limit = 10, { signal } = {}) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));

  const data = await apiFetch(`/products/search?${params.toString()}`, {
    signal,
  });

  return Array.isArray(data.data) ? data.data : [];
}
