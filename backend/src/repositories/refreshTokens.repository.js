const { pool } = require("../config/db");

async function createToken({ userId, tokenHash, expiresAt, ip, userAgent }) {
  const [res] = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, expiresAt, ip || null, userAgent || null],
  );
  return res.insertId;
}

async function findValidByHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, replaced_by_hash
     FROM refresh_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash],
  );
  const t = rows[0];
  if (!t) return null;

  const now = new Date();
  if (t.revoked_at) return null;
  if (new Date(t.expires_at) <= now) return null;

  return t;
}

async function revokeToken(id) {
  const [res] = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [id],
  );
  return res.affectedRows === 1;
}

async function rotateToken({ id, newHash }) {
  const [res] = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW(),
         replaced_by_hash = ?
     WHERE id = ? AND revoked_at IS NULL`,
    [newHash, id],
  );
  return res.affectedRows === 1;
}
async function revokeAllForUser(userId) {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userId],
  );
}

module.exports = {
  createToken,
  findValidByHash,
  revokeToken,
  rotateToken,
  revokeAllForUser,
};
