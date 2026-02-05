/**
 * Admin — Produits (API)
 * - Liste filtrée + pagination (q, category, active, limit, offset)
 * - Création / mise à jour / suppression
 * - Normalise la réponse en { data, count }
 */
import { apiFetch } from "./apiClient.js";

/**
 * Normalise les réponses possibles en { data, count, total }.
 * @param {any} res Réponse API (tableau ou objet {data,count,total})
 * @returns {{data:any[], count:number, total:number}}
 */
function normalizeList(res) {
  if (Array.isArray(res)) {
    return { data: res, count: res.length, total: res.length };
  }
  if (Array.isArray(res?.data)) {
    const total = res.total ?? res.count ?? res.data.length;
    return { data: res.data, count: res.count ?? res.data.length, total };
  }
  return { data: [], count: 0, total: 0 };
}

/**
 * Liste les produits (admin) avec filtres optionnels.
 * @param {object} [filters]
 * @param {string} [filters.q] Recherche texte
 * @param {string} [filters.category] Catégorie (BIGBAG | ROCHE | AUTRE)
 * @param {string|number|boolean} [filters.active] Filtre actif/inactif ("1"/"0" ou 1/0)
 * @param {number} [filters.limit] Pagination : taille
 * @param {number} [filters.offset] Pagination : offset
 * @returns {Promise<{data:any[], count:number}>}
 */
export async function listProducts({
  q,
  category,
  active,
  limit,
  offset,
} = {}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (category) params.set("category", category);

  // active peut venir en "1"/"0" (select) ou en number
  if (active !== undefined && active !== null && active !== "") {
    params.set("active", String(active));
  }

  if (Number.isFinite(limit)) params.set("limit", String(limit));
  if (Number.isFinite(offset)) params.set("offset", String(offset));

  const qs = params.toString();
  const res = await apiFetch(`/products${qs ? `?${qs}` : ""}`);

  return normalizeList(res);
}

/**
 * Crée un produit.
 * @param {object} payload Données produit (selon le contrat API)
 * @returns {Promise<any>}
 */
export async function createProduct(payload) {
  return apiFetch(`/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Met à jour partiellement un produit.
 * @param {number|string} id Identifiant produit
 * @param {object} payload Champs à modifier (selon le contrat API)
 * @returns {Promise<any>}
 */
export async function patchProduct(id, payload) {
  return apiFetch(`/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Supprime un produit.
 * @param {number|string} id Identifiant produit
 * @returns {Promise<any>}
 */
export async function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}
