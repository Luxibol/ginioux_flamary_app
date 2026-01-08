/**
 * Contrôleur commandes : récupération du détail d'une commande + ses lignes.
 */
const ordersRepository = require("../repositories/orders.repository");

/**
 * GET /orders/:id
 * Retourne :
 * - order : informations commande
 * - lines : lignes produits associées
 *
 * Réponses :
 * - 200 : { order, lines }
 * - 400 : ID invalide
 * - 404 : commande introuvable
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
