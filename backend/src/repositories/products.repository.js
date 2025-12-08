const { pool } = require("../config/db");

/**
 * Récupère les produits actifs dont le libellé PDF exact est dans la liste.
 *
 * @param {string[]} labels - Liste de libellés PDF (pdfLabel) venant du parsing.
 * @returns {Promise<Array>} Tableau d'objets produits.
 */

async function getProductsByPdfLabels(labels) {
  if (!labels || labels.length === 0) return [];

  // On déduplique pour éviter un IN trop long
  const unique = Array.from(new Set(labels));

  const placeholders = unique.map(() => "?").join(", ");
  const sql = `
    SELECT id, pdf_label_exact, category, weight_per_unit_kg, is_active
    FROM products_catalog
    WHERE pdf_label_exact IN (${placeholders})
      AND is_active = 1
  `;

  const [rows] = await pool.query(sql, unique);
  return rows; // tableau d'objets produits
}

module.exports = {
  getProductsByPdfLabels,
};
