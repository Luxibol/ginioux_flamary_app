/**
 * Historique / Archives (API)
 * - Liste des commandes archivées (filtres q / période) + pagination
 * - Historique d'une commande archivée
 */
import { apiFetch } from "./apiClient.js";

/**
 * Liste les commandes archivées (filtres optionnels).
 * @param {object} [options]
 * @param {string} [options.q] Recherche texte
 * @param {string} [options.period] Période (ALL | 7D | 30D | 90D)
 * @param {number} [options.limit] Pagination : taille
 * @param {number} [options.offset] Pagination : offset
 * @returns {Promise<any>}
 */
export async function getArchivedOrders({ q, period, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (period) params.set("period", period);
  if (Number.isFinite(limit)) params.set("limit", String(limit));
  if (Number.isFinite(offset)) params.set("offset", String(offset));

  const qs = params.toString();
  return apiFetch(`/orders/archived${qs ? `?${qs}` : ""}`);
}

/**
 * Récupère l'historique d'une commande (timeline / événements).
 * @param {number|string} id Identifiant commande
 * @returns {Promise<any>}
 */
export async function getArchivedOrderHistory(id) {
  return apiFetch(`/orders/${id}/history`);
}
