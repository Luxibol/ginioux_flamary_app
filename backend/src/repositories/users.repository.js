const { pool } = require("../config/db");

/**
 * Récupère un utilisateur par login.
 * @param {string} login
 * @returns {Promise<object|null>}
 */
async function findByLogin(login) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, login, password_hash, role, is_active, must_change_password
     FROM users
     WHERE login = ?
     LIMIT 1`,
    [login]
  );
  return rows[0] || null;
}

/**
 * Récupère un utilisateur par id (sans password).
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, login, role, is_active, must_change_password
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Met à jour le mot de passe (hash) + flag must_change_password.
 * @param {number} id
 * @param {string} passwordHash
 * @param {number} mustChange 0|1
 */
async function updatePassword(id, passwordHash, mustChange) {
  const [res] = await pool.query(
    `UPDATE users
     SET password_hash = ?, must_change_password = ?
     WHERE id = ?`,
    [passwordHash, mustChange ? 1 : 0, id]
  );
  return res.affectedRows === 1;
}

module.exports = {
  findByLogin,
  findById,
  updatePassword,
};
