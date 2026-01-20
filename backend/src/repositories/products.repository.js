/**
 * @file backend/src/repositories/products.repository.js
 * @description Repository produits : catalogue (CRUD) + recherche + usage (orders/shipments).
 */
const { pool } = require("../config/db");

/**
 * Retourne les produits actifs dont le pdf_label_exact est dans la liste.
 * @param {string[]} labels
 * @returns {Promise<object[]>}
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

/**
 * Recherche simple par libellé PDF (autocomplete).
 * @param {string} q
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function searchProducts(q, limit = 10) {
  const like = `%${q}%`;
  const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);

  const [rows] = await pool.query(
    `
    SELECT id, pdf_label_exact, weight_per_unit_kg
    FROM products_catalog
    WHERE pdf_label_exact LIKE ?
    ORDER BY pdf_label_exact ASC
    LIMIT ?
    `,
    [like, lim],
  );

  return rows;
}

/**
 * Liste paginée du catalogue produits (filtres + usage_count).
 * @param {{q?:string|null, category?:string|null, active?:0|1|null, limit?:number, offset?:number}} [filters]
 * @returns {Promise<object[]>}
 */
async function listProducts({
  q = null,
  category = null,
  active = null,
  limit = 50,
  offset = 0,
} = {}) {
  const where = ["1=1"];
  const params = [];

  if (q) {
    where.push("pc.pdf_label_exact LIKE ?");
    params.push(`%${q}%`);
  }
  if (category) {
    where.push("pc.category = ?");
    params.push(category);
  }
  if (active === 0 || active === 1) {
    where.push("pc.is_active = ?");
    params.push(active);
  }

  // usage_count = références dans order_products + shipment_lines
  const sql = `
    SELECT
      pc.id,
      pc.pdf_label_exact,
      pc.category,
      pc.weight_per_unit_kg,
      pc.is_active,
      pc.created_at,
      pc.updated_at,
      (COUNT(DISTINCT op.id) + COUNT(DISTINCT sl.id)) AS usage_count
    FROM products_catalog pc
    LEFT JOIN order_products op ON op.product_id = pc.id
    LEFT JOIN shipment_lines sl ON sl.product_id = pc.id
    WHERE ${where.join(" AND ")}
    GROUP BY pc.id
    ORDER BY pc.pdf_label_exact ASC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Crée un produit dans products_catalog et retourne la ligne créée.
 * @param {{pdf_label_exact:string, category:string, weight_per_unit_kg:number|null, is_active?:0|1}} payload
 * @returns {Promise<object|null>}
 */
async function createProduct({
  pdf_label_exact,
  category,
  weight_per_unit_kg,
  is_active = 1,
}) {
  const [r] = await pool.query(
    `
    INSERT INTO products_catalog (pdf_label_exact, category, weight_per_unit_kg, is_active)
    VALUES (?, ?, ?, ?)
    `,
    [pdf_label_exact, category, weight_per_unit_kg, is_active],
  );

  const id = r.insertId;
  const [rows] = await pool.query(
    `SELECT id, pdf_label_exact, category, weight_per_unit_kg, is_active FROM products_catalog WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Met à jour un produit (patch) et retourne la ligne mise à jour.
 * @param {number} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
async function patchProduct(id, patch) {
  const sets = [];
  const params = [];

  if (patch.pdf_label_exact !== undefined) {
    sets.push("pdf_label_exact = ?");
    params.push(patch.pdf_label_exact);
  }
  if (patch.category !== undefined) {
    sets.push("category = ?");
    params.push(patch.category);
  }
  if (patch.weight_per_unit_kg !== undefined) {
    sets.push("weight_per_unit_kg = ?");
    params.push(patch.weight_per_unit_kg);
  }
  if (patch.is_active !== undefined) {
    sets.push("is_active = ?");
    params.push(patch.is_active);
  }

  if (sets.length === 0) return null;

  params.push(id);
  const [r] = await pool.query(
    `UPDATE products_catalog SET ${sets.join(", ")} WHERE id = ? LIMIT 1`,
    params,
  );
  if (r.affectedRows === 0) return null;

  const [rows] = await pool.query(
    `SELECT id, pdf_label_exact, category, weight_per_unit_kg, is_active FROM products_catalog WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Compte les références d'un produit (order_products + shipment_lines).
 * @param {number} id
 * @returns {Promise<{order_products:number, shipment_lines:number}>}
 */
async function getUsage(id) {
  const [[op]] = await pool.query(
    `SELECT COUNT(*) AS c FROM order_products WHERE product_id = ?`,
    [id],
  );
  const [[sl]] = await pool.query(
    `SELECT COUNT(*) AS c FROM shipment_lines WHERE product_id = ?`,
    [id],
  );
  return {
    order_products: Number(op?.c || 0),
    shipment_lines: Number(sl?.c || 0),
  };
}

/**
 * Supprime un produit uniquement s'il n'est référencé nulle part.
 * @param {number} id
 * @returns {Promise<{notFound?:true, deleted?:boolean, usage?:{order_products:number, shipment_lines:number}}>}
 */
async function deleteProductIfUnused(id) {
  // Vérifie existence du produit.
  const [exists] = await pool.query(
    `SELECT id FROM products_catalog WHERE id = ? LIMIT 1`,
    [id],
  );
  if (exists.length === 0) return { notFound: true };

  const usage = await getUsage(id);
  const total = usage.order_products + usage.shipment_lines;

  if (total > 0) {
    return { deleted: false, usage };
  }

  const [r] = await pool.query(
    `DELETE FROM products_catalog WHERE id = ? LIMIT 1`,
    [id],
  );
  return { deleted: r.affectedRows > 0, usage };
}

module.exports = {
  getProductsByPdfLabels,
  searchProducts,
  listProducts,
  createProduct,
  patchProduct,
  deleteProductIfUnused,
};
