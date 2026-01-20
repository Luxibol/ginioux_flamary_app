/**
 * @file backend/src/repositories/users.repository.js
 * @description Repository users : accès BDD utilisateurs (auth, admin users, gestion comptes).
 */
const { pool } = require("../config/db");

/**
 * Récupère un utilisateur par login.
 * @param {string} login
 * @returns {Promise<object|null>} Utilisateur avec password_hash (auth), sinon null.
 */
async function findByLogin(login) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, login, password_hash, role, is_active, must_change_password
     FROM users
     WHERE login = ?
     LIMIT 1`,
    [login],
  );
  return rows[0] || null;
}

/**
 * Récupère un utilisateur par id (sans password).
 * @param {number} id
 * @returns {Promise<object|null>} Utilisateur sans password_hash, sinon null.
 */
async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, login, role, is_active, must_change_password
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Met à jour le mot de passe (hash) + flag must_change_password.
 * @param {number} id
 * @param {string} passwordHash
 * @param {number} mustChange 0|1
 * @returns {Promise<boolean>}
 */
async function updatePassword(id, passwordHash, mustChange) {
  const [res] = await pool.query(
    `UPDATE users
     SET password_hash = ?, must_change_password = ?
     WHERE id = ?`,
    [passwordHash, mustChange ? 1 : 0, id],
  );
  return res.affectedRows === 1;
}

/**
 * Vérifie si un login existe (option : exclure un userId).
 * @param {string} login
 * @param {{excludeUserId?: number}} [options]
 * @returns {Promise<boolean>}
 */
async function existsLogin(login, { excludeUserId } = {}) {
  if (excludeUserId) {
    const [rows] = await pool.query(
      `SELECT 1 AS ok FROM users WHERE login = ? AND id <> ? LIMIT 1`,
      [login, excludeUserId],
    );
    return rows.length > 0;
  }

  const [rows] = await pool.query(
    `SELECT 1 AS ok FROM users WHERE login = ? LIMIT 1`,
    [login],
  );
  return rows.length > 0;
}

/**
 * Liste les utilisateurs avec filtres (q, role, active) + compteur total.
 * @param {{q?:string, role?:string, active?:0|1}} [filters]
 * @returns {Promise<{rows: object[], count: number}>}
 */
async function listUsers({ q, role, active } = {}) {
  const where = [];
  const params = [];

  if (q) {
    where.push(`(first_name LIKE ? OR last_name LIKE ? OR login LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  if (role) {
    where.push(`role = ?`);
    params.push(role);
  }

  if (active === 0 || active === 1) {
    where.push(`is_active = ?`);
    params.push(active);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT id, first_name, last_name, login, role, is_active, must_change_password, created_at, updated_at
     FROM users
     ${whereSql}
     ORDER BY last_name ASC, first_name ASC`,
    params,
  );

  const [c] = await pool.query(
    `SELECT COUNT(*) AS count FROM users ${whereSql}`,
    params,
  );

  return { rows, count: Number(c[0]?.count || 0) };
}

/**
 * Crée un utilisateur et retourne l'utilisateur créé (sans password_hash).
 * @param {{first_name:string, last_name:string, login:string, password_hash:string, role:string, is_active:number|boolean, must_change_password:number|boolean}} payload
 * @returns {Promise<object>}
 */
async function createUser({
  first_name,
  last_name,
  login,
  password_hash,
  role,
  is_active,
  must_change_password,
}) {
  const [res] = await pool.query(
    `INSERT INTO users (first_name, last_name, login, password_hash, role, is_active, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      first_name,
      last_name,
      login,
      password_hash,
      role,
      is_active ? 1 : 0,
      must_change_password ? 1 : 0,
    ],
  );

  const id = res.insertId;
  const user = await findById(id);
  return user;
}

/**
 * Met à jour partiellement un utilisateur (champs autorisés : first_name, last_name, login, role, is_active).
 * @param {number} id
 * @param {object} patch
 * @returns {Promise<boolean>}
 */
async function patchUser(id, patch) {
  const fields = [];
  const params = [];

  const allowed = ["first_name", "last_name", "login", "role", "is_active"];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      fields.push(`${k} = ?`);
      params.push(patch[k]);
    }
  }

  if (fields.length === 0) return false;

  params.push(id);

  const [res] = await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  return res.affectedRows === 1;
}

module.exports = {
  findByLogin,
  findById,
  updatePassword,
  existsLogin,
  listUsers,
  createUser,
  patchUser,
};
