import { apiFetch } from "./apiClient";

/**
 * Bureau - liste des commandes avec shipments non ack + détails.
 * GET /orders/bureau/shipments/pending
 */
export async function getBureauPendingShipments() {
  return apiFetch("/orders/bureau/shipments/pending");
}

/**
 * Bureau - ack tous les shipments non ack d'une commande + archive si EXP_COMPLETE.
 * POST /orders/:orderId/shipments/ack
 */
export async function ackOrderShipments(orderId) {
  return apiFetch(`/orders/${orderId}/shipments/ack`, { method: "POST" });
}
