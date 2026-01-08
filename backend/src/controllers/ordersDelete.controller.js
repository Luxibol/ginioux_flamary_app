/**
 * Contrôleur commandes : suppression d'une commande.
 * Supprime la commande et ses lignes (via transaction côté repository).
 */
const ordersRepository = require("../repositories/orders.repository");

/**
 * DELETE /orders/:id
 * Réponses :
 * - 204 : supprimée
 * - 400 : ID invalide
 * - 404 : commande introuvable
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
