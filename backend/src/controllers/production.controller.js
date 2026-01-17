/**
 * Contrôleur Production
 * - GET /orders/production : commandes à produire
 * - PATCH /orders/:orderId/lines/:lineId/ready : MAJ quantité prête d'une ligne
 */
const ordersRepository = require("../repositories/orders.repository");

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

const ALLOWED_PERIODS = ["ALL", "7D", "30D", "90D"];

function periodToDays(period) {
  if (period === "7D") return 7;
  if (period === "30D") return 30;
  if (period === "90D") return 90;
  return null;
}

async function getProductionOrders(req, res) {
  try {
    const q = (req.query.q || "").trim();

    const limitRaw = parseInt(req.query.limit, 10);
    const offsetRaw = parseInt(req.query.offset, 10);

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const data = await ordersRepository.findProductionOrders({
      q,
      limit,
      offset,
    });

    return res.json({
      count: data.length,
      filters: { q, limit, offset },
      data,
    });
  } catch (err) {
    console.error("GET /orders/production error:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors du chargement (production)." });
  }
}

async function patchOrderLineReady(req, res) {
  try {
    const orderId = asInt(req.params.orderId);
    const lineId = asInt(req.params.lineId);
    if (!orderId || orderId <= 0 || !lineId || lineId <= 0) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    const ready = asInt(req.body?.ready);
    if (ready === null || ready < 0) {
      return res
        .status(400)
        .json({ error: "ready invalide (entier >= 0 attendu)." });
    }

    const result = await ordersRepository.updateOrderLineReady(
      orderId,
      lineId,
      ready,
    );

    if (result?.notFound) {
      return res.status(404).json({ error: "Commande ou ligne introuvable." });
    }

    return res.json(result);
  } catch (err) {
    console.error("PATCH /orders/:orderId/lines/:lineId/ready error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erreur mise à jour ready." });
  }
}

async function getProductionShipments(req, res) {
  try {
    const q = (req.query.q || "").trim();

    const limitRaw = parseInt(req.query.limit, 10);
    const offsetRaw = parseInt(req.query.offset, 10);

    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const data = await ordersRepository.findProductionShipments({
      q,
      limit,
      offset,
    });

    return res.json({
      count: data.length,
      filters: { q, limit, offset },
      data,
    });
  } catch (err) {
    console.error("GET /orders/shipments error:", err);
    return res
      .status(500)
      .json({ error: "Erreur chargement expéditions (production)." });
  }
}

async function patchOrderLineLoaded(req, res) {
  try {
    const orderId = asInt(req.params.orderId);
    const lineId = asInt(req.params.lineId);
    if (!orderId || orderId <= 0 || !lineId || lineId <= 0) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    const loaded = asInt(req.body?.loaded);
    if (loaded === null || loaded < 0) {
      return res
        .status(400)
        .json({ error: "loaded invalide (entier >= 0 attendu)." });
    }

    const result = await ordersRepository.updateOrderLineLoaded(
      orderId,
      lineId,
      loaded,
    );

    if (result?.notFound) {
      return res.status(404).json({ error: "Commande ou ligne introuvable." });
    }

    return res.json(result);
  } catch (err) {
    console.error("PATCH /orders/:orderId/lines/:lineId/loaded error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erreur mise à jour loaded." });
  }
}

async function postDepartTruck(req, res) {
  try {
    const orderId = asInt(req.params.orderId);
    if (!orderId || orderId <= 0) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    const result = await ordersRepository.departTruck(orderId, {
      createdByUserId: null,
    });
    if (result?.notFound) {
      return res.status(404).json({ error: "Commande introuvable." });
    }

    return res.json(result);
  } catch (err) {
    console.error("POST /orders/:orderId/shipments/depart error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Erreur départ camion." });
  }
}

async function getProducedCount(req, res) {
  try {
    const period = String(req.query.period || "7D").toUpperCase();
    const days = periodToDays(period);

    const [count, totals] = await Promise.all([
      ordersRepository.countProducedOrders({ days }),
      ordersRepository.sumProducedTotals({ days }),
    ]);

    res.json({ count, period, totals });
  } catch (e) {
    res.status(400).json({ error: e.message || "Requête invalide" });
  }
}

// puis export :
module.exports = {
  getProductionOrders,
  patchOrderLineReady,
  getProductionShipments,
  patchOrderLineLoaded,
  postDepartTruck,
  getProducedCount,
};
