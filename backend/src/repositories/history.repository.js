/**
 * @file backend/src/repositories/history.repository.js
 * @description Repository historique : commandes archivées + détail (lignes + expéditions).
 */
const { pool } = require("../config/db");

/**
 * Construit la requête "base" des archives (groupée par commande) sous forme de sous-requête
 * afin de filtrer proprement sur last_departed_at + paginer + compter.
 * @param {{q?:string|null}} filters
 * @returns {{sql:string, params:any[]}}
 */
function buildArchivedBase({ q = null } = {}) {
  const where = ["o.is_archived = 1"];
  const params = [];

  if (q) {
    where.push("(o.arc LIKE ? OR o.client_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
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
  `;

  return { sql, params };
}

/**
 * Compte le nombre total de commandes archivées (avec filtres q + days).
 * @param {{q?:string|null, days?:number|null}} [filters]
 * @returns {Promise<number>}
 */
async function countArchivedOrders({ q = null, days = null } = {}) {
  const base = buildArchivedBase({ q });

  const params = [...base.params];
  let where = "1=1";

  // Si days est défini, on garde les commandes dont la dernière expédition >= NOW()-days
  // On inclut aussi celles sans expédition si tu veux les garder quand ALL (days null).
  if (days) {
    where =
      "(t.last_departed_at IS NOT NULL AND t.last_departed_at >= (NOW() - INTERVAL ? DAY))";
    params.push(days);
  }

  const sql = `
    SELECT COUNT(*) AS c
    FROM (${base.sql}) t
    WHERE ${where}
  `;

  const [[row]] = await pool.query(sql, params);
  return Number(row?.c || 0);
}

/**
 * Liste paginée des commandes archivées (avec dernière date de départ).
 * @param {{q?:string|null, days?:number|null, limit?:number, offset?:number}} [filters]
 * @returns {Promise<object[]>}
 */
async function findArchivedOrders({
  q = null,
  days = null,
  limit = 50,
  offset = 0,
} = {}) {
  const base = buildArchivedBase({ q });

  const params = [...base.params];
  let where = "1=1";

  if (days) {
    where =
      "(t.last_departed_at IS NOT NULL AND t.last_departed_at >= (NOW() - INTERVAL ? DAY))";
    params.push(days);
  }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  params.push(lim, off);

  const sql = `
    SELECT
      t.id,
      t.arc,
      t.client_name,
      t.order_date,
      t.pickup_date,
      t.priority,
      t.expedition_status,
      t.last_departed_at
    FROM (${base.sql}) t
    WHERE ${where}
    ORDER BY t.last_departed_at DESC, t.order_date DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Retourne l'historique complet d'une commande (order + lignes + expéditions + récap).
 * @param {number} orderId
 * @returns {Promise<object|null>}
 */
async function getArchivedOrderHistory(orderId) {
  const [orderRows] = await pool.query(
    `
    SELECT
      id, arc, client_name, order_date, pickup_date,
      priority, expedition_status, is_archived, created_at, updated_at
    FROM orders
    WHERE id = ?
    LIMIT 1
    `,
    [orderId],
  );
  const order = orderRows[0];
  if (!order) return null;

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
    [orderId],
  );

  const [shipments] = await pool.query(
    `
    SELECT id, departed_at
    FROM shipments
    WHERE order_id = ?
    ORDER BY departed_at DESC, id DESC
    `,
    [orderId],
  );

  const shipmentIds = shipments.map((s) => s.id);
  const linesByShipment = new Map();

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
      [shipmentIds],
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

  const orderedTotal = lines.reduce(
    (acc, l) => acc + Number(l.quantity_ordered || 0),
    0,
  );
  const shippedTotal = lines.reduce(
    (acc, l) => acc + Number(l.quantity_shipped || 0),
    0,
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

module.exports = {
  countArchivedOrders,
  findArchivedOrders,
  getArchivedOrderHistory,
};
