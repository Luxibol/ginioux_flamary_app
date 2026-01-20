/**
 * Mappers "Orders" :
 * - API -> modèle UI (modale)
 * - UI (modale) -> payload PATCH pour l'API
 */

/**
 * Transforme la réponse API (order + lines) en structure utilisée par la modale.
 * Convertit les champs snake_case -> camelCase et normalise les valeurs numériques.
 * @param {any} details
 * @returns {any}
 */
export function mapOrderDetailsToModal(details) {
  const order = details?.order ?? {};
  const lines = details?.lines ?? [];

  return {
    id: order.id,
    orderRef: order.arc,
    clientName: order.client_name,
    dateCommande: order.order_date || "",
    dateEnlevement: order.pickup_date || "",
    priorite:
      order.priority === "URGENT"
        ? "Urgent"
        : order.priority === "INTERMEDIAIRE"
          ? "Intermédiaire"
          : "Normal",
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.product_id,
      product: l.label,
      poidsKg: l.weight_per_unit_kg ?? "",
      quantite: Number(l.quantity_ordered ?? 0),
      quantityReady: Number(l.quantity_ready ?? 0),
      quantityShipped: Number(l.quantity_shipped ?? 0),
    })),
  };
}

/**
 * Transforme l'état de la modale en payload attendu par PATCH /orders/:id.
 * Remarque : `pickupDate` est envoyé à null si vide.
 * @param {any} payload
 * @returns {any}
 */
export function mapModalToPatchPayload(payload) {
  return {
    arc: payload.order.arc,
    clientName: payload.order.clientName,
    orderDate: payload.order.orderDate,
    pickupDate: payload.order.pickupDate || null,
    priority: payload.order.priority,
    lines: payload.lines.map((l) => ({
      id: l.id || null,
      productId: l.productId || null,
      label: l.label || null,
      quantity: l.quantity,
    })),
  };
}
