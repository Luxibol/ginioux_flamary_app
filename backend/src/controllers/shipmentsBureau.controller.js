const { pool } = require("../config/db");
const shipmentsRepo = require("../repositories/shipments.repository");

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * GET /orders/bureau/shipments/pending
 * Retourne les commandes avec shipments non ack + détails shipments + remaining + recap.
 */
async function getPending(req, res) {
  try {
    const userId = req.user?.id ?? null; // si ton auth met req.user
    const orders = await shipmentsRepo.findBureauPendingOrders({ userId });

    const orderIds = orders.map((o) => o.id);

    const shipRows =
      await shipmentsRepo.findPendingShipmentsWithLines(orderIds);
    const remainingRows = await shipmentsRepo.findRemainingByOrder(orderIds);
    const recapRows = await shipmentsRepo.findRecapTotals(orderIds);

    // Indexations
    const shipmentsByOrder = new Map();
    for (const r of shipRows) {
      if (!shipmentsByOrder.has(r.order_id))
        shipmentsByOrder.set(r.order_id, new Map());
      const mapByShipment = shipmentsByOrder.get(r.order_id);

      if (!mapByShipment.has(r.shipment_id)) {
        mapByShipment.set(r.shipment_id, {
          id: r.shipment_id,
          departed_at: r.departed_at,
          lines: [],
        });
      }
      mapByShipment.get(r.shipment_id).lines.push({
        product_id: r.product_id,
        label: r.label,
        quantity_loaded: Number(r.quantity_loaded),
        weight_per_unit_kg:
          r.weight_per_unit_kg === null ? null : Number(r.weight_per_unit_kg),
      });
    }

    const remainingByOrder = new Map();
    for (const r of remainingRows) {
      if (!remainingByOrder.has(r.order_id))
        remainingByOrder.set(r.order_id, []);
      remainingByOrder.get(r.order_id).push({
        product_id: r.product_id,
        label: r.label,
        remaining_qty: Number(r.remaining_qty),
        weight_per_unit_kg:
          r.weight_per_unit_kg === null ? null : Number(r.weight_per_unit_kg),
      });
    }

    const recapByOrder = new Map();
    for (const r of recapRows) {
      recapByOrder.set(r.order_id, {
        shipped_total: Number(r.shipped_total || 0),
        ordered_total: Number(r.ordered_total || 0),
      });
    }

    const data = orders.map((o) => {
      const mapByShipment = shipmentsByOrder.get(o.id) || new Map();
      const pending_shipments = Array.from(mapByShipment.values());

      return {
        order: {
          id: o.id,
          arc: o.arc,
          client_name: o.client_name,
          pickup_date: o.pickup_date,
          priority: o.priority,
          expedition_status: o.expedition_status,
          last_departed_at: o.last_departed_at,

          messagesCount: Number(o.messagesCount ?? 0),
          unreadCount: Number(o.unreadCount ?? 0),
        },
        pending_shipments,
        remaining: remainingByOrder.get(o.id) || [],
        recap: recapByOrder.get(o.id) || { shipped_total: 0, ordered_total: 0 },
      };
    });

    return res.json({ count: data.length, data });
  } catch (err) {
    console.error("GET /orders/bureau/shipments/pending error:", err);
    return res
      .status(500)
      .json({ error: "Erreur chargement expéditions (bureau)." });
  }
}

/**
 * POST /orders/:orderId/shipments/ack
 * Ack tous les shipments non ack de la commande.
 * Archive la commande si elle est EXP_COMPLETE.
 */
async function postAckForOrder(req, res) {
  const connection = await pool.getConnection();
  try {
    const orderId = asInt(req.params.orderId);
    if (!orderId || orderId <= 0) {
      connection.release();
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    await connection.beginTransaction();

    const acked = await shipmentsRepo.ackPendingShipmentsForOrder(
      connection,
      orderId,
      {
        bureauAckBy: null, // plus tard: req.user?.id
      },
    );

    const archived = await shipmentsRepo.archiveOrderIfComplete(
      connection,
      orderId,
    );

    await connection.commit();

    return res.json({
      ok: true,
      acked_shipments: acked,
      order_archived: archived,
    });
  } catch (err) {
    await connection.rollback();
    console.error("POST /orders/:orderId/shipments/ack error:", err);
    return res.status(500).json({ error: "Erreur ack expéditions (bureau)." });
  } finally {
    connection.release();
  }
}

module.exports = { getPending, postAckForOrder };
