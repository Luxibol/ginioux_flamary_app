/**
 * @file backend/src/controllers/orderComments.controller.js
 * @description Contrôleur commentaires de commande : liste + création + gestion “lu/non-lu”.
 */
const ordersRepository = require("../repositories/orders.repository");
const orderCommentsRepository = require("../repositories/orderComments.repository");
const { asInt } = require("../utils/parse");

/**
 * Liste les commentaires d'une commande et marque comme lus pour l'utilisateur courant.
 * Route: GET /orders/:id/comments
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getOrderComments(req, res) {
  try {
    const orderId = asInt(req.params.id);
    if (!orderId) return res.status(400).json({ error: "ID invalide." });

    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    await orderCommentsRepository.markRead({ orderId, userId: req.user.id });

    const [data, counts] = await Promise.all([
      orderCommentsRepository.listByOrderId(orderId),
      orderCommentsRepository.getCountsForOrder({
        orderId,
        userId: req.user.id,
      }),
    ]);

    return res.json({
      order: { id: order.id, arc: order.arc },
      ...counts,
      data,
    });
  } catch (err) {
    console.error("GET /orders/:id/comments error:", err);
    return res.status(500).json({ error: "Erreur chargement commentaires." });
  }
}

/**
 * Ajoute un commentaire à une commande, marque comme lu pour l'auteur, renvoie liste + compteurs.
 * Route: POST /orders/:id/comments
 * Body: { content }
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function postOrderComment(req, res) {
  try {
    const orderId = asInt(req.params.id);
    if (!orderId) return res.status(400).json({ error: "ID invalide." });

    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ error: "Commentaire vide." });

    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    await orderCommentsRepository.create({
      orderId,
      authorId: req.user.id,
      content,
    });

    await orderCommentsRepository.markRead({ orderId, userId: req.user.id });

    const [data, counts] = await Promise.all([
      orderCommentsRepository.listByOrderId(orderId),
      orderCommentsRepository.getCountsForOrder({
        orderId,
        userId: req.user.id,
      }),
    ]);

    return res.status(201).json({ ...counts, data });
  } catch (err) {
    console.error("POST /orders/:id/comments error:", err);
    return res.status(500).json({ error: "Erreur ajout commentaire." });
  }
}

module.exports = { getOrderComments, postOrderComment };
