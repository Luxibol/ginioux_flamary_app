const { pool } = require("../config/db");

async function listByOrderId(orderId) {
  const [rows] = await pool.query(
    `
    SELECT
      c.id,
      c.order_id,
      c.author_id,
      u.first_name,
      u.last_name,
      c.content,
      c.created_at
    FROM order_comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.order_id = ?
    ORDER BY c.created_at ASC, c.id ASC
    `,
    [orderId],
  );
  return rows;
}

async function create({ orderId, authorId, content }) {
  const [r] = await pool.query(
    `
    INSERT INTO order_comments (order_id, author_id, content)
    VALUES (?, ?, ?)
    `,
    [orderId, authorId, content],
  );
  return r.insertId;
}

async function markRead({ orderId, userId }) {
  await pool.query(
    `
    INSERT INTO order_comment_reads (order_id, user_id, last_read_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE last_read_at = NOW()
    `,
    [orderId, userId],
  );
}

async function getCountsForOrder({ orderId, userId }) {
  const [[row]] = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM order_comments WHERE order_id = ?) AS messagesCount,
      (
        SELECT COUNT(*)
        FROM order_comments c
        LEFT JOIN order_comment_reads r
          ON r.order_id = c.order_id AND r.user_id = ?
        WHERE c.order_id = ?
          AND c.created_at > COALESCE(r.last_read_at, '1970-01-01 00:00:00')
      ) AS unreadCount
    `,
    [orderId, userId, orderId],
  );

  return {
    messagesCount: Number(row?.messagesCount ?? 0),
    unreadCount: Number(row?.unreadCount ?? 0),
  };
}

module.exports = {
  listByOrderId,
  create,
  markRead,
  getCountsForOrder,
};
