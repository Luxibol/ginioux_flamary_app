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
