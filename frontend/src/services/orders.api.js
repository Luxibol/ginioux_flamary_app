/**
 * API "orders" :
 * - getActiveOrders : liste filtrée (query params)
 * - getOrderDetails : détail d’une commande (order + lines)
 * - patchOrderMeta : édition commande + synchro lignes
 * - deleteOrder : suppression commande
 */
import { apiFetch } from "./apiClient";

/**
 * Récupère les commandes actives (non archivées) avec filtres optionnels.
 * @param {{q?:string, priority?:string, state?:string}} [filters]
 * @returns {Promise<{count:number, filters:object, data:any[]}>}
 */
export async function getActiveOrders({ q, priority, state } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (priority) params.set("priority", priority);
  if (state) params.set("state", state);

  const qs = params.toString();
  return apiFetch(`/orders/active${qs ? `?${qs}` : ""}`);
}

/**
 * Récupère le détail d'une commande (infos commande + lignes).
 * @param {number|string} id Identifiant de commande
 * @returns {Promise<{order:object, lines:any[]}>}
 */
export async function getOrderDetails(id) {
  return apiFetch(`/orders/${id}`);
}

/**
 * Met à jour les informations d'une commande et/ou ses lignes.
 * @param {number|string} id Identifiant de commande
 * @param {object} payload Données à modifier (ex: { priority, pickupDate, lines: [...] })
 * @returns {Promise<{status:"updated", order:object, lines:any[]}>}
 */
export async function patchOrderMeta(id, payload) {
  return apiFetch(`/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Supprime une commande et ses lignes.
 * @param {number|string} id Identifiant de commande
 * @returns {Promise<any>} (souvent vide / 204)
 */
export async function deleteOrder(id) {
  return apiFetch(`/orders/${id}`, { method: "DELETE" });
}

/**
 * Récupère les commandes à produire (Production).
 * @param {{q?:string, limit?:number, offset?:number}} [filters]
 * @returns {Promise<{count:number, filters:object, data:any[]}>}
 */
export async function getProductionOrders({ q, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (Number.isFinite(limit)) params.set("limit", String(limit));
  if (Number.isFinite(offset)) params.set("offset", String(offset));

  const qs = params.toString();
  return apiFetch(`/orders/production${qs ? `?${qs}` : ""}`);
}

/**
 * Met à jour la quantité prête d'une ligne de commande (Production).
 * @param {number|string} orderId
 * @param {number|string} lineId
 * @param {number} ready Quantité prête (entier >= 0)
 * @returns {Promise<{status:"updated", productionStatus:string, order:object, lines:any[]}>}
 */
export async function patchOrderLineReady(orderId, lineId, ready) {
  return apiFetch(`/orders/${orderId}/lines/${lineId}/ready`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ready }),
  });
}

/**
 * Valide manuellement la production d'une commande (bouton "Production terminée").
 * Côté backend : ne valide que si PROD_COMPLETE et pas déjà validée.
 * @param {number|string} orderId
 * @returns {Promise<{status:string, order:object}>}
 */
export async function postProductionValidate(orderId) {
  return apiFetch(`/orders/${orderId}/production-validate`, { method: "POST" });
}
