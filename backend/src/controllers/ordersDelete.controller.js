/**
 * @file backend/src/controllers/ordersDelete.controller.js
 * @description Contrôleur commandes : suppression d'une commande (transaction repository).
 */
const ordersRepository = require("../repositories/orders.repository");

/**
 * Supprime une commande (et ses lignes via transaction repository).
 * Route: DELETE /orders/:id
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function deleteOrder(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const deleted = await ordersRepository.deleteOrderById(id);

    if (!deleted) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /orders/:id error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

module.exports = { deleteOrder };
