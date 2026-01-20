/**
 * Expéditions (API)
 * - Bureau : liste des commandes avec expéditions à valider (pending)
 * - Bureau : validation (ack) des expéditions d'une commande
 */
import { apiFetch } from "./apiClient.js";

/**
 * Bureau : récupère les commandes ayant des expéditions non validées (pending).
 * @returns {Promise<any>}
 */
export async function getBureauPendingShipments() {
  return apiFetch("/orders/bureau/shipments/pending");
}

/**
 * Bureau : valide (ack) toutes les expéditions non validées d'une commande.
 * @param {number|string} orderId Identifiant commande
 * @returns {Promise<any>}
 */
export async function ackOrderShipments(orderId) {
  return apiFetch(`/orders/${orderId}/shipments/ack`, { method: "POST" });
}
