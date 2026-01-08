/**
 * Repository produits : accès BDD au catalogue produits.
 * Utilisé pour résoudre les libellés PDF exacts et pour l'autocomplete.
 */
const { pool } = require("../config/db");

/**
 * Recherche de produits par libellé PDF exact (LIKE).
 * @param {string} q Texte recherché.
 * @param {number} limit Nombre max de résultats (borné).
 */
async function getProductsByPdfLabels(labels) {
  const norm = (s) => String(s ?? "").trim();
  if (!Array.isArray(labels) || labels.length === 0) return [];

  const unique = Array.from(new Set(labels.map(norm).filter(Boolean)));
  if (unique.length === 0) return [];

  const placeholders = unique.map(() => "?").join(", ");
  const sql = `
    SELECT id, pdf_label_exact, category, weight_per_unit_kg, is_active
    FROM products_catalog
    WHERE pdf_label_exact IN (${placeholders})
      AND is_active = 1
  `;

  const [rows] = await pool.query(sql, unique);
  return rows;
}

async function searchProducts(q, limit = 10) {
  const like = `%${q}%`;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);

  const [rows] = await pool.query(
    `
    SELECT
      id,
      pdf_label_exact,
      weight_per_unit_kg
    FROM products_catalog
    WHERE pdf_label_exact LIKE ?
    ORDER BY pdf_label_exact ASC
    LIMIT ?
    `,
    [like, lim]
  );

  return rows;
}

module.exports = {
  getProductsByPdfLabels,
  searchProducts,
};
