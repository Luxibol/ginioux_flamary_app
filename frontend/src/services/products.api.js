/**
 * API "products" :
 * - searchProducts : autocomplete produits (libellé PDF exact) avec limit + AbortController.
 * Retourne directement un tableau (normalisé depuis { data: [...] }).
 */
import { apiFetch } from "./apiClient";

/**
 * Recherche des produits par libellé (autocomplete).
 * Le backend renvoie { data: [...] }.
 *
 * @param {string} q Terme de recherche
 * @param {number} [limit=10] Nombre max de résultats
 * @param {{signal?: AbortSignal}} [options] Permet d'annuler la requête (AbortController)
 * @returns {Promise<Array<{id:number, pdf_label_exact:string, weight_per_unit_kg:number}>>}
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
