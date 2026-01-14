const { pool } = require("../config/db");

/**
 * Liste commandes archivées (orders.is_archived = 1)
 * + dernière expédition (MAX shipments.departed_at)
 * + filtrage "période" optionnel basé sur departed_at
 */
async function findArchivedOrders({ q = null, days = null } = {}) {
  const where = ["o.is_archived = 1"];
  const params = [];

  if (q) {
    where.push("(o.arc LIKE ? OR o.client_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  // Filtre période : basé sur la date de départ camion (departed_at)
  // Si days != null => on garde les commandes dont la dernière expédition >= NOW() - INTERVAL days DAY
  let having = "";
  if (days) {
    having = "HAVING last_departed_at >= (NOW() - INTERVAL ? DAY)";
    params.push(days);
  }

  const sql = `
    SELECT
      o.id,
      o.arc,
      o.client_name,
      o.order_date,
      o.pickup_date,
      o.priority,
      o.expedition_status,
      MAX(s.departed_at) AS last_departed_at
    FROM orders o
    LEFT JOIN shipments s ON s.order_id = o.id
    WHERE ${where.join(" AND ")}
    GROUP BY o.id
    ${having}
    ORDER BY last_departed_at DESC, o.order_date DESC
    LIMIT 200
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Détail historique :
 * - order
 * - lignes (ordered/shipped)
 * - expéditions (shipments + shipment_lines)
 * - recap (shipped_total / ordered_total + nb expéditions)
 */
async function getArchivedOrderHistory(orderId) {
  // 1) commande (on accepte même si non archivée, mais l’écran "historique" l’appellera sur une archivée)
  const [orderRows] = await pool.query(
    `
    SELECT
      id, arc, client_name, order_date, pickup_date,
      priority, expedition_status, is_archived, created_at, updated_at
    FROM orders
    WHERE id = ?
    LIMIT 1
    `,
    [orderId]
  );
  const order = orderRows[0];
  if (!order) return null;

  // 2) lignes commande (ordered / shipped)
  const [lines] = await pool.query(
    `
    SELECT
      op.id,
      op.product_id,
      COALESCE(NULLIF(op.product_label_pdf, ''), pc.pdf_label_exact) AS label,
      op.quantity_ordered,
      op.quantity_shipped
    FROM order_products op
    JOIN products_catalog pc ON pc.id = op.product_id
    WHERE op.order_id = ?
    ORDER BY op.id ASC
    `,
    [orderId]
  );

  // 3) shipments
  const [shipments] = await pool.query(
    `
    SELECT id, departed_at
    FROM shipments
    WHERE order_id = ?
    ORDER BY departed_at DESC, id DESC
    `,
    [orderId]
  );

  // 4) shipment_lines (en 1 requête)
  const shipmentIds = shipments.map((s) => s.id);
  let linesByShipment = new Map();

  if (shipmentIds.length) {
    const [shipLines] = await pool.query(
      `
      SELECT
        sl.shipment_id,
        sl.product_id,
        COALESCE(NULLIF(sl.product_label_pdf, ''), pc.pdf_label_exact) AS label,
        sl.quantity_loaded
      FROM shipment_lines sl
      JOIN products_catalog pc ON pc.id = sl.product_id
      WHERE sl.shipment_id IN (?)
      ORDER BY sl.shipment_id DESC, sl.id ASC
      `,
      [shipmentIds]
    );

    for (const l of shipLines) {
      if (!linesByShipment.has(l.shipment_id))
        linesByShipment.set(l.shipment_id, []);
      linesByShipment.get(l.shipment_id).push({
        product_id: l.product_id,
        label: l.label,
        quantity_loaded: Number(l.quantity_loaded || 0),
      });
    }
  }

  const shipmentsFull = shipments.map((s) => ({
    id: s.id,
    departed_at: s.departed_at,
    lines: linesByShipment.get(s.id) || [],
  }));

  // 5) recap
  const orderedTotal = lines.reduce(
    (acc, l) => acc + Number(l.quantity_ordered || 0),
    0
  );
  const shippedTotal = lines.reduce(
    (acc, l) => acc + Number(l.quantity_shipped || 0),
    0
  );

  return {
    order,
    lines: lines.map((l) => ({
      product_id: l.product_id,
      label: l.label,
      quantity_ordered: Number(l.quantity_ordered || 0),
      quantity_shipped: Number(l.quantity_shipped || 0),
    })),
    shipments: shipmentsFull,
    recap: {
      ordered_total: orderedTotal,
      shipped_total: shippedTotal,
      shipments_count: shipmentsFull.length,
      last_departed_at: shipmentsFull[0]?.departed_at || null,
    },
  };
}

module.exports = { findArchivedOrders, getArchivedOrderHistory };
