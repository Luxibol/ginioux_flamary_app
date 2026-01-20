/**
 * @file backend/src/controllers/orderShipments.controller.js
 * @description Contrôleur expéditions d’une commande : liste des départs camion (shipments).
 */
const ordersRepository = require("../repositories/orders.repository");

/**
 * Retourne la liste des expéditions (shipments) d'une commande.
 * Route: GET /orders/:id/shipments
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getOrderShipments(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de commande invalide." });
    }

    const order = await ordersRepository.findOrderById(id);
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    const shipments = await ordersRepository.findShipmentsByOrderId(id);
    return res.json({ orderId: id, shipments });
  } catch (err) {
    console.error("GET /orders/:id/shipments error:", err);
    return res.status(500).json({ error: "Erreur chargement expéditions." });
  }
}

module.exports = { getOrderShipments };
