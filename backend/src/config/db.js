/**
 * Configuration BDD (MySQL via mysql2/promise)
 * Exporte :
 * - pool : pool de connexions
 * - testConnection : probe simple pour /health/db
 */
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: ["DATE"],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Vérifie que la base répond (requête minimale).
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  const [rows] = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

module.exports = { pool, testConnection };
