/**
 * API Admin - Produits
 * Endpoints backend:
 * - GET    /products
 * - POST   /products
 * - PATCH  /products/:id
 * - DELETE /products/:id
 */
import { apiFetch } from "./apiClient";

/** Normalise les réponses possibles (au cas où ton backend renvoie {data:...} ou {count,data}). */
function normalizeList(res) {
  if (Array.isArray(res)) return { data: res, count: res.length };
  if (Array.isArray(res?.data))
    return { data: res.data, count: res.count ?? res.data.length };
  return { data: [], count: 0 };
}

/**
 * Liste produits avec filtres:
 * - q (string)
 * - category (BIGBAG|ROCHE|AUTRE)
 * - active ("1"|"0") ou 1/0
 * - limit, offset (optionnel)
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

/** Création produit */
export async function createProduct(payload) {
  return apiFetch(`/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Patch produit */
export async function patchProduct(id, payload) {
  return apiFetch(`/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Suppression produit */
export async function deleteProduct(id) {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}
