/**
 * @file backend/src/controllers/history.controller.js
 * @description Contrôleur historique : liste des commandes archivées + détail d'une commande.
 */
const historyRepository = require("../repositories/history.repository");

const ALLOWED_PERIODS = ["ALL", "7D", "30D", "90D"];

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function periodToDays(period) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  if (period === "90D") return 90;
  return null;
}

/**
 * Liste les commandes archivées (filtres + pagination).
 * Route: GET /orders/archived
 *
 * Query:
 * - q? : recherche
 * - period? : ALL | 7D | 30D | 90D
 * - limit? : 1..200 (défaut 50)
 * - offset? : >=0 (défaut 0)
 *
 * Réponse: { total, count, filters, data }
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getArchivedOrders(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const periodRaw = String(req.query.period || "ALL").toUpperCase();
    const period = ALLOWED_PERIODS.includes(periodRaw) ? periodRaw : "ALL";

    const days = periodToDays(period);

    const limitRaw = asInt(req.query.limit);
    const offsetRaw = asInt(req.query.offset);

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const filters = {
      q: q || null,
      period,
      days,
      limit,
      offset,
    };

    const [total, data] = await Promise.all([
      historyRepository.countArchivedOrders({ q: q || null, days }),
      historyRepository.findArchivedOrders({
        q: q || null,
        days,
        limit,
        offset,
      }),
    ]);

    return res.json({ total, count: data.length, filters, data });
  } catch (err) {
    console.error("GET /orders/archived error:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors du chargement de l’historique." });
  }
}

/**
 * Retourne le détail historique d'une commande archivée.
 * Route: GET /orders/:id/history
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getArchivedOrderHistory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "ID invalide" });

    const result = await historyRepository.getArchivedOrderHistory(id);
    if (!result)
      return res.status(404).json({ error: "Commande introuvable." });

    return res.json(result);
  } catch (err) {
    console.error("GET /orders/:id/history error:", err);
    return res
      .status(500)
      .json({ error: "Erreur chargement détails historique." });
  }
}

module.exports = { getArchivedOrders, getArchivedOrderHistory };
