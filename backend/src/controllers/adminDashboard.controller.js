/**
 * @file backend/src/controllers/adminDashboard.controller.js
 * @description Contrôleur des mini-stats du dashboard admin.
 */
const historyRepository = require("../repositories/history.repository");
const ordersRepository = require("../repositories/orders.repository");

const ALLOWED_PERIODS = ["ALL", "7D", "30D", "90D"];

/**
 * Convertit une période en nombre de jours.
 * @param {string} period
 * @returns {number|null}
 */
function periodToDays(period) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  if (period === "90D") return 90;
  return null;
}

/**
 * Retourne les mini-stats du bas du dashboard admin.
 * Route: GET /orders/admin/dashboard/bottom-stats
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function getAdminDashboardBottomStats(req, res) {
  try {
    const periodRaw = String(req.query.period || "7D").toUpperCase();
    const period = ALLOWED_PERIODS.includes(periodRaw) ? periodRaw : "7D";
    const days = periodToDays(period);

    const [archivedCount, bottomShipTotals, producedCount, producedTotals] =
      await Promise.all([
        historyRepository.countArchivedOrders({ days }),
        historyRepository.sumArchivedShippedTotals({ days }),
        ordersRepository.countProducedOrders({ days }),
        ordersRepository.sumProducedTotals({ days }),
      ]);

    return res.json({
      period,
      archivedCount,
      bottomShipTotals,
      producedCount,
      producedTotals,
    });
  } catch (err) {
    console.error("GET /orders/admin/dashboard/bottom-stats error:", err);
    return res.status(500).json({
      error: "Erreur lors du chargement des mini-stats du dashboard admin.",
    });
  }
}

module.exports = {
  getAdminDashboardBottomStats,
};
