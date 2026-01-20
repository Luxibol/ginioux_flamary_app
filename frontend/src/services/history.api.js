/**
 * Historique / Archives (API)
 * - Liste des commandes archivées (filtres q / période)
 * - Historique d'une commande archivée
 */
import { apiFetch } from "./apiClient.js";

/**
 * Liste les commandes archivées (filtres optionnels).
 * @param {object} [options]
 * @param {string} [options.q] Recherche texte
 * @param {string} [options.period] Période (selon le contrat API)
 * @returns {Promise<any>}
 */
export async function getArchivedOrders({ q, period } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (period) params.set("period", period);
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
