const { pool } = require("../config/db");
const productsRepository = require("./products.repository");

/**
 * Retourne la commande si un ARC existe déjà, sinon null.
 *
 * @param {string} arc - Numéro d'ARC à vérifier.
 * @returns {Promise<object|null>} Première ligne trouvée ou null.
 */
async function findOrderByArc(arc) {
  const [rows] = await pool.query("SELECT id, arc FROM orders WHERE arc = ?", [
    arc,
  ]);
  return rows[0] || null;
}

/**
 * Crée une commande + ses lignes dans une transaction.
 *
 * @param {object} orderData - Données de la commande à créer.
 * @param {string} orderData.arc
 * @param {string} orderData.clientName
 * @param {string} orderData.orderDate       - Date de commande au format YYYY-MM-DD.
 * @param {string|null} orderData.pickupDate - Date d'enlèvement au format YYYY-MM-DD ou null.
 * @param {string} orderData.priority        - "URGENT" | "INTERMEDIAIRE" | "NORMAL".
 * @param {string} orderData.productionStatus
 * @param {string} orderData.expeditionStatus
 * @param {number|null} orderData.createdByUserId
 * @param {Array<{productId: number, quantity: number}>} orderProducts - Lignes produits de la commande.
 *
 * @returns {Promise<number>} L'id de la commande créée.
 */

async function createOrderWithLines(orderData, orderProducts) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const insertOrderSql = `
      INSERT INTO orders (
        arc,
        client_name,
        order_date,
        pickup_date,
        priority,
        production_status,
        expedition_status,
        is_archived,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [orderResult] = await connection.query(insertOrderSql, [
      orderData.arc,
      orderData.clientName,
      orderData.orderDate, // "YYYY-MM-DD"
      orderData.pickupDate || null,
      orderData.priority, // "URGENT" | "INTERMEDIAIRE" | "NORMAL"
      orderData.productionStatus, // ex : "A_PROD"
      orderData.expeditionStatus, // ex : "NON_EXPEDIEE"
      0, // is_archived (0 = non archivée par défaut)
      orderData.createdByUserId || null, // created_by (peut être null pour l'instant)
    ]);

    const orderId = orderResult.insertId;

    if (orderProducts && orderProducts.length > 0) {
      const values = orderProducts.map((p) => [
        orderId,
        p.productId,
        p.quantity,
      ]);

      // INSERT dans order_products : (order_id, product_id, quantity_ordered)
      // Les colonnes de timestamps sont gérées par la BDD (valeurs par défaut).
      const insertLinesSql = `
        INSERT INTO order_products (order_id, product_id, quantity_ordered)
        VALUES ?
      `;

      await connection.query(insertLinesSql, [values]);
    }

    await connection.commit();
    return orderId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function createOrderFromPreview(
  preview,
  { createdByUserId = null } = {}
) {
  // preview = { arc, clientName, orderDate, products:[{pdfLabel, quantity}] }

  if (!preview?.arc) {
    const err = new Error("ARC manquant dans le preview");
    err.code = 422;
    throw err;
  }

  const existing = await findOrderByArc(preview.arc);
  if (existing) {
    return {
      action: "skipped",
      existingOrderId: existing.id,
      arc: preview.arc,
    };
  }

  const labels = (preview.products || [])
    .map((p) => p.pdfLabel)
    .filter(Boolean);
  const products = await productsRepository.getProductsByPdfLabels(labels);

  // Map pdf_label_exact -> productId
  const map = new Map(products.map((p) => [p.pdf_label_exact, p.id]));

  const missingLabels = [];
  const orderProducts = [];

  for (const p of preview.products || []) {
    const productId = map.get(p.pdfLabel);
    if (!productId) {
      missingLabels.push(p.pdfLabel);
      continue;
    }
    orderProducts.push({
      productId,
      quantity: p.quantity,
    });
  }

  if (missingLabels.length > 0) {
    const err = new Error(
      "Produits introuvables en base pour certains libellés PDF."
    );
    err.code = 422;
    err.missingLabels = missingLabels;
    throw err;
  }

  const orderData = {
    arc: preview.arc,
    clientName: preview.clientName ?? null,
    orderDate: preview.orderDate ?? null, // déjà ISO
    pickupDate: null, // pas encore dans parsing
    priority: "NORMAL", // On pourras le rendre modifiable depuis la modale
    productionStatus: "A_PROD",
    expeditionStatus: "NON_EXPEDIEE",
    createdByUserId,
  };

  const orderId = await createOrderWithLines(orderData, orderProducts);
  return { action: "created", orderId, arc: preview.arc };
}

module.exports = {
  findOrderByArc,
  createOrderWithLines,
  createOrderFromPreview,
};
