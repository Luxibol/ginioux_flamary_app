/**
 * @file backend/src/controllers/shipmentsStats.controller.js
 * @description Contrôleur stats expéditions : agrégats 7j / 30j.
 */
const shipmentsRepository = require("../repositories/shipments.repository");

/**
 * Retourne les stats expéditions (commandes distinctes + totaux par catégorie).
 * Route: GET /orders/shipments/stats
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getShipmentStats(req, res) {
  try {
    const [weekOrders, weekTotals, monthOrders, monthTotals] =
      await Promise.all([
        shipmentsRepository.countDepartedDistinctOrdersSinceDays(7),
        shipmentsRepository.sumDepartedTotalsSinceDays(7),
        shipmentsRepository.countDepartedDistinctOrdersSinceDays(30),
        shipmentsRepository.sumDepartedTotalsSinceDays(30),
      ]);

    return res.json({
      week: { orders: weekOrders, totals: weekTotals },
      month: { orders: monthOrders, totals: monthTotals },
    });
  } catch (err) {
    console.error("GET /orders/shipments/stats error:", err);
    return res.status(500).json({ error: "Erreur stats expéditions." });
  }
}

module.exports = { getShipmentStats };
