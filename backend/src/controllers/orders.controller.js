/**
 * @file backend/src/controllers/orders.controller.js
 * @description Contrôleur commandes : liste des commandes actives + validation production.
 */
const ordersRepository = require("../repositories/orders.repository");

const ALLOWED_PRIORITIES = ["URGENT", "INTERMEDIAIRE", "NORMAL"];
const ALLOWED_STATES = [
  "EN_PREPARATION",
  "PRETE_A_EXPEDIER",
  "PARTIELLEMENT_EXPEDIEE",
  "EXPEDIEE",
];

/**
 * Liste des commandes actives avec filtres et pagination.
 * Route: GET /orders/active
 * Query: q, priority, state, limit, offset
 * Response: { count, total, filters, data }
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getActiveOrders(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const priority = (req.query.priority || "").toUpperCase();
    const state = (req.query.state || "").toUpperCase();

    const limitRaw = parseInt(req.query.limit, 10);
    const offsetRaw = parseInt(req.query.offset, 10);

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const filters = {
      q: q.length ? q : null,
      priority: ALLOWED_PRIORITIES.includes(priority) ? priority : null,
      state: ALLOWED_STATES.includes(state) ? state : null,
      limit,
      offset,
    };

    const [data, total] = await Promise.all([
      ordersRepository.findActiveOrders(filters, { userId: req.user?.id }),
      ordersRepository.countActiveOrders(filters),
    ]);

    res.json({
      count: data.length,
      total,
      filters,
      data,
    });
  } catch (err) {
    console.error("GET /orders/active error:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des commandes." });
  }
}

/**
 * Valide la production d'une commande si elle est éligible.
 * Route: POST /orders/:id/production-validate
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function postProductionValidate(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const ok = await ordersRepository.validateProduction(id);
    if (!ok) {
      // soit commande inexistante, soit pas PROD_COMPLETE, soit déjà validée
      return res.status(400).json({
        error:
          "Validation impossible (commande inexistante, non complète ou déjà validée).",
      });
    }

    const order = await ordersRepository.findOrderById(id);
    return res.json({ status: "validated", order });
  } catch (err) {
    console.error("POST /orders/:id/production-validate error:", err);
    return res.status(500).json({ error: "Erreur validation production." });
  }
}

module.exports = { getActiveOrders, postProductionValidate };
