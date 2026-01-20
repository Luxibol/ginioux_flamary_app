/**
 * @file backend/src/controllers/orderDetails.controller.js
 * @description Contrôleur commandes : détail d'une commande + lignes associées.
 */
const ordersRepository = require("../repositories/orders.repository");

/**
 * Retourne le détail d'une commande et ses lignes.
 * Route: GET /orders/:id
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getOrderDetails(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de commande invalide." });
    }

    const order = await ordersRepository.findOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Commande introuvable." });
    }

    const lines = await ordersRepository.findOrderLinesByOrderId(id);

    return res.json({ order, lines });
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors de la récupération de la commande." });
  }
}

module.exports = { getOrderDetails };
