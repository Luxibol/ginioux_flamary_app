/**
 * Contrôleur commandes : récupération de la liste des commandes actives.
 * Supporte filtres (q, priority, state) + pagination (limit/offset).
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
 * GET /orders/active
 * Query :
 * - q : recherche (ARC ou nom client)
 * - priority : URGENT | INTERMEDIAIRE | NORMAL
 * - state : EN_PREPARATION | PRETE_A_EXPEDIER | PARTIELLEMENT_EXPEDIEE | EXPEDIEE
 * - limit / offset : pagination
 *
 * Retour : { count, filters, data }
 * Note : count = nombre d'éléments retournés (pas un total global).
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

    const data = await ordersRepository.findActiveOrders(filters);

    res.json({
      count: data.length,
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
 * POST /orders/:id/production-validate
 * Valide la production d'une commande (si PROD_COMPLETE).
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
