const { pool } = require("../config/db");

/**
 * Récupère les commandes ayant au moins un shipment non ack par le bureau.
 * Retourne des lignes "order header" avec last_departed_at.
 */
// shipments.repository.js

async function findBureauPendingOrders({ userId } = {}) {
  if (!userId)
    throw new Error("userId manquant pour les compteurs commentaires");

  const [rows] = await pool.query(
    `
    SELECT
      o.id,
      o.arc,
      o.client_name,
      o.pickup_date,
      o.priority,
      o.expedition_status,
      MAX(s.departed_at) AS last_departed_at,

      COALESCE(oc.messagesCount, 0) AS messagesCount,
      COALESCE(uc.unreadCount, 0) AS unreadCount

    FROM orders o
    JOIN shipments s ON s.order_id = o.id

    LEFT JOIN (
      SELECT order_id, COUNT(*) AS messagesCount
      FROM order_comments
      GROUP BY order_id
    ) oc ON oc.order_id = o.id

    LEFT JOIN (
      SELECT c.order_id, COUNT(*) AS unreadCount
      FROM order_comments c
      LEFT JOIN order_comment_reads r
        ON r.order_id = c.order_id AND r.user_id = ?
      WHERE c.author_id <> ?
        AND c.created_at > COALESCE(r.last_read_at, '1970-01-01 00:00:00')
      GROUP BY c.order_id
    ) uc ON uc.order_id = o.id

    WHERE o.is_archived = 0
      AND s.bureau_ack_at IS NULL

    GROUP BY
      o.id, o.arc, o.client_name, o.pickup_date, o.priority, o.expedition_status,
      oc.messagesCount, uc.unreadCount

    ORDER BY last_departed_at DESC
    `,
    [userId, userId],
  );

  return rows;
}

/**
 * Récupère tous les shipments non ack + leurs lignes (pour une liste d'orders).
 * @param {number[]} orderIds
 */
async function findPendingShipmentsWithLines(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return [];

  const [rows] = await pool.query(
    `
    SELECT
      s.order_id,
      s.id AS shipment_id,
      s.departed_at,

      sl.product_id,
      COALESCE(NULLIF(sl.product_label_pdf,''), pc.pdf_label_exact) AS label,
      sl.quantity_loaded,
      pc.weight_per_unit_kg

    FROM shipments s
    JOIN shipment_lines sl ON sl.shipment_id = s.id
    LEFT JOIN products_catalog pc ON pc.id = sl.product_id

    WHERE s.bureau_ack_at IS NULL
      AND s.order_id IN (?)

    ORDER BY s.order_id ASC, s.departed_at DESC, sl.id ASC
    `,
    [orderIds],
  );

  return rows;
}

/**
 * Récupère le "reste à expédier" par produit pour une liste d'orders.
 * @param {number[]} orderIds
 */
async function findRemainingByOrder(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return [];

  const [rows] = await pool.query(
    `
    SELECT
      op.order_id,
      op.product_id,
      COALESCE(NULLIF(op.product_label_pdf,''), pc.pdf_label_exact) AS label,
      (op.quantity_ordered - op.quantity_shipped) AS remaining_qty,
      pc.weight_per_unit_kg
    FROM order_products op
    JOIN products_catalog pc ON pc.id = op.product_id
    WHERE op.order_id IN (?)
      AND (op.quantity_ordered - op.quantity_shipped) > 0
    ORDER BY op.order_id ASC, op.id ASC
    `,
    [orderIds],
  );

  return rows;
}

/**
 * Récap totals shipped/ordered pour une liste d'orders.
 * @param {number[]} orderIds
 */
async function findRecapTotals(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return [];

  const [rows] = await pool.query(
    `
    SELECT
      order_id,
      SUM(COALESCE(quantity_shipped,0)) AS shipped_total,
      SUM(COALESCE(quantity_ordered,0)) AS ordered_total
    FROM order_products
    WHERE order_id IN (?)
    GROUP BY order_id
    `,
    [orderIds],
  );

  return rows;
}

/**
 * Ack bureau : marque tous les shipments non ack d'une commande.
 * Retourne le nombre de shipments ack.
 */
async function ackPendingShipmentsForOrder(
  connection,
  orderId,
  { bureauAckBy = null } = {},
) {
  const [r] = await connection.query(
    `
    UPDATE shipments
    SET bureau_ack_at = NOW(),
        bureau_ack_by = ?
    WHERE order_id = ?
      AND bureau_ack_at IS NULL
    `,
    [bureauAckBy, orderId],
  );

  return r.affectedRows || 0;
}

/**
 * Archive la commande si EXP_COMPLETE.
 * Retourne true si archivée.
 */
async function archiveOrderIfComplete(connection, orderId) {
  const [r] = await connection.query(
    `
    UPDATE orders
    SET is_archived = 1
    WHERE id = ?
      AND expedition_status = 'EXP_COMPLETE'
    LIMIT 1
    `,
    [orderId],
  );

  return (r.affectedRows || 0) > 0;
}

async function countDepartedDistinctOrdersSinceDays(days) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(DISTINCT s.order_id) AS c
    FROM shipments s
    WHERE s.departed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
    [days],
  );
  return Number(rows?.[0]?.c ?? 0);
}

async function sumDepartedTotalsSinceDays(days) {
  const [rows] = await pool.query(
    `
    SELECT pc.category AS category,
           SUM(sl.quantity_loaded) AS qty
    FROM shipments s
    JOIN shipment_lines sl ON sl.shipment_id = s.id
    JOIN products_catalog pc ON pc.id = sl.product_id
    WHERE s.departed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY pc.category
    `,
    [days],
  );

  const totals = { bigbag: 0, roche: 0 };
  for (const r of rows || []) {
    const cat = String(r.category || "").toUpperCase();
    const qty = Number(r.qty ?? 0);
    if (!Number.isFinite(qty)) continue;

    if (cat === "BIGBAG") totals.bigbag += qty; // SmallBag inclus
    if (cat === "ROCHE") totals.roche += qty;
  }

  return totals;
}

module.exports = {
  findBureauPendingOrders,
  findPendingShipmentsWithLines,
  findRemainingByOrder,
  findRecapTotals,
  ackPendingShipmentsForOrder,
  archiveOrderIfComplete,
  countDepartedDistinctOrdersSinceDays,
  sumDepartedTotalsSinceDays,
};
