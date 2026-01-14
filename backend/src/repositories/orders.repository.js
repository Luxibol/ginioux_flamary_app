/**
 * Repository commandes : accès BDD aux commandes et à leurs lignes.
 * Inclut des opérations transactionnelles (création, suppression, mise à jour avec synchronisation des lignes).
 */
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
 * Valide la production d'une commande.
 * Règle : seulement si la commande est PROD_COMPLETE et non déjà validée.
 *
 * @param {number} orderId
 * @returns {Promise<boolean>} true si une ligne a été modifiée, sinon false
 */
async function validateProduction(orderId) {
  const [r] = await pool.query(
    `
    UPDATE orders
    SET production_validated_at = NOW()
    WHERE id = ?
      AND production_status = 'PROD_COMPLETE'
      AND production_validated_at IS NULL
    LIMIT 1
    `,
    [orderId]
  );
  return r.affectedRows > 0;
}

/**
 * Crée une commande + ses lignes dans une transaction.
 *
 * @param {object} orderData - Données de la commande à créer.
 * @param {string} orderData.arc
 * @param {string} orderData.clientName
 * @param {string} orderData.orderDate       - Date de commande
 * @param {string|null} orderData.pickupDate - Date d'enlèvement
 * @param {string} orderData.priority
 * @param {string} orderData.productionStatus
 * @param {string} orderData.expeditionStatus
 * @param {number|null} orderData.createdByUserId
 * @param {Array<{productId: number, quantity: number}>} orderProducts - Lignes produits de la commande.
 * Transaction : création de la commande + insertion des lignes (order_products).
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
      orderData.orderDate,
      orderData.pickupDate || null,
      orderData.priority, // "URGENT" | "INTERMEDIAIRE" | "NORMAL"
      orderData.productionStatus,
      orderData.expeditionStatus,
      0,
      orderData.createdByUserId || null,
    ]);

    const orderId = orderResult.insertId;

    if (orderProducts && orderProducts.length > 0) {
      const values = orderProducts.map((p) => [
        orderId,
        p.productId,
        Math.trunc(Number(p.quantity ?? 0)),
        0,
        0,
      ]);

      const insertLinesSql = `
        INSERT INTO order_products (order_id, product_id, quantity_ordered, quantity_ready, quantity_shipped)
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

/**
 * Crée une commande à partir d'une prévisualisation (import PDF).
 * - Valide ARC / date / quantités
 * - Résout les produits via le libellé PDF exact (products_catalog)
 * - Refuse si des libellés sont inconnus (422) ou si l'ARC existe déjà (skipped)
 */
async function createOrderFromPreview(
  preview,
  { createdByUserId = null } = {}
) {
  const norm = (s) => String(s ?? "").trim();

  if (!preview?.arc || !norm(preview.arc)) {
    const err = new Error("ARC manquant dans le preview");
    err.code = 422;
    throw err;
  }

  const arc = norm(preview.arc);

  const existing = await findOrderByArc(arc);
  if (existing) {
    return {
      action: "skipped",
      existingOrderId: existing.id,
      arc,
    };
  }

  if (!preview?.orderDate) {
    const err = new Error("Date de commande manquante dans le preview.");
    err.code = 422;
    throw err;
  }

  const productsList = Array.isArray(preview.products) ? preview.products : [];

  const labels = productsList.map((p) => norm(p.pdfLabel)).filter(Boolean);
  const products = await productsRepository.getProductsByPdfLabels(labels);

  const map = new Map(products.map((p) => [norm(p.pdf_label_exact), p.id]));

  const missingLabels = [];
  const orderProducts = [];

  for (const p of productsList) {
    const label = norm(p.pdfLabel);
    const productId = map.get(label);

    if (!productId) {
      if (label) missingLabels.push(label);
      continue;
    }

    const qty = Math.trunc(Number(p.quantity ?? 0));
    if (!Number.isFinite(qty) || qty < 0) {
      const err = new Error("Quantité invalide dans le preview.");
      err.code = 422;
      throw err;
    }

    orderProducts.push({ productId, quantity: qty });
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
    arc,
    clientName: preview.clientName ?? null,
    orderDate: preview.orderDate, // ISO attendu
    pickupDate: preview.pickupDate ?? null,
    priority: preview.priority || "NORMAL",
    productionStatus: "A_PROD",
    expeditionStatus: "NON_EXPEDIEE",
    createdByUserId,
  };

  const orderId = await createOrderWithLines(orderData, orderProducts);
  return { action: "created", orderId, arc };
}

// Filtre d'état "métier" calculé à partir des statuts production/expédition.
async function findActiveOrders({
  q = null,
  priority = null,
  state = null,
  limit = 50,
  offset = 0,
} = {}) {
  const where = ["o.is_archived = 0"];
  const params = [];

  if (q) {
    where.push("(o.arc LIKE ? OR o.client_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  if (priority) {
    where.push("o.priority = ?");
    params.push(priority);
  }

  if (state === "PARTIELLEMENT_EXPEDIEE") {
    where.push("o.expedition_status = 'EXP_PARTIELLE'");
  } else if (state === "EXPEDIEE") {
    where.push("o.expedition_status = 'EXP_COMPLETE'");
  } else if (state === "PRETE_A_EXPEDIER") {
    where.push(
      "o.production_status = 'PROD_COMPLETE' AND o.expedition_status = 'NON_EXPEDIEE'"
    );
  } else if (state === "EN_PREPARATION") {
    where.push(
      "o.expedition_status = 'NON_EXPEDIEE' AND o.production_status IN ('A_PROD', 'PROD_PARTIELLE')"
    );
  }

  const sql = `
    SELECT
      o.id,
      o.arc,
      o.client_name,
      o.order_date,
      o.pickup_date,
      o.priority,
      o.production_status,
      o.expedition_status,
      o.created_at,
      CASE
        WHEN o.expedition_status = 'EXP_PARTIELLE' THEN 'Partiellement expédiée'
        WHEN o.expedition_status = 'EXP_COMPLETE' THEN 'Expédiée'
        WHEN o.production_status IN ('A_PROD', 'PROD_PARTIELLE') THEN 'En préparation'
        WHEN o.production_status = 'PROD_COMPLETE' AND o.expedition_status = 'NON_EXPEDIEE' THEN 'Prête à expédier'
        ELSE '—'
      END AS order_state_label,
      CASE
        WHEN o.expedition_status = 'EXP_PARTIELLE' THEN 'PARTIELLEMENT_EXPEDIEE'
        WHEN o.expedition_status = 'EXP_COMPLETE' THEN 'EXPEDIEE'
        WHEN o.production_status IN ('A_PROD', 'PROD_PARTIELLE') THEN 'EN_PREPARATION'
        WHEN o.production_status = 'PROD_COMPLETE' AND o.expedition_status = 'NON_EXPEDIEE' THEN 'PRETE_A_EXPEDIER'
        ELSE 'UNKNOWN'
      END AS order_state
    FROM orders o
    WHERE ${where.join(" AND ")}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findOrderById(id) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      arc,
      client_name,
      order_date,
      pickup_date,
      priority,
      production_status,
      expedition_status,
      is_archived,
      created_by,
      created_at,
      updated_at
    FROM orders
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findOrderLinesByOrderId(orderId) {
  const [rows] = await pool.query(
    `
    SELECT
      op.id,
      op.order_id,
      op.product_id,
      COALESCE(NULLIF(op.product_label_pdf, ''), pc.pdf_label_exact) AS label,
      pc.category,
      pc.weight_per_unit_kg,
      op.quantity_ordered,
      op.quantity_ready,
      op.quantity_shipped,
      op.quantity_loaded
    FROM order_products op
    JOIN products_catalog pc ON pc.id = op.product_id
    WHERE op.order_id = ?
    ORDER BY op.id ASC
    `,
    [orderId]
  );

  return rows;
}

async function updateOrderMetaById(id, { priority, pickupDate, orderDate }) {
  const sets = [];
  const params = [];

  if (priority !== undefined) {
    sets.push("priority = ?");
    params.push(priority);
  }

  if (pickupDate !== undefined) {
    sets.push("pickup_date = ?");
    params.push(pickupDate);
  }

  if (orderDate !== undefined) {
    sets.push("order_date = ?");
    params.push(orderDate);
  }

  if (sets.length === 0) return false;

  const sql = `
    UPDATE orders
    SET ${sets.join(", ")}
    WHERE id = ?
    LIMIT 1
  `;

  params.push(id);

  const [result] = await pool.query(sql, params);
  return result.affectedRows > 0;
}

// Transaction : suppression des lignes puis de la commande (évite les orphelins).
async function deleteOrderById(orderId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query("DELETE FROM order_products WHERE order_id = ?", [
      orderId,
    ]);

    const [result] = await connection.query(
      "DELETE FROM orders WHERE id = ? LIMIT 1",
      [orderId]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Met à jour une commande et synchronise ses lignes dans une transaction.
 * Stratégie : le payload `lines` représente l'état attendu :
 * - lignes absentes => supprimées (si autorisé)
 * - lignes avec id => mises à jour
 * - lignes sans id => insérées
 */
async function updateOrderAndLinesById(orderId, patch = {}, lines = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      "SELECT id FROM orders WHERE id = ? LIMIT 1",
      [orderId]
    );
    if (orderRows.length === 0) throw new Error("Commande introuvable");

    const sets = [];
    const params = [];

    if (patch.arc !== undefined) {
      sets.push("arc = ?");
      params.push(patch.arc);
    }
    if (patch.clientName !== undefined) {
      sets.push("client_name = ?");
      params.push(patch.clientName);
    }
    if (patch.orderDate !== undefined) {
      sets.push("order_date = ?");
      params.push(patch.orderDate);
    }
    if (patch.priority !== undefined) {
      sets.push("priority = ?");
      params.push(patch.priority);
    }
    if (patch.pickupDate !== undefined) {
      sets.push("pickup_date = ?");
      params.push(patch.pickupDate);
    }

    if (sets.length > 0) {
      params.push(orderId);
      const [r] = await connection.query(
        `UPDATE orders SET ${sets.join(", ")} WHERE id = ? LIMIT 1`,
        params
      );
      if (r.affectedRows === 0) throw new Error("Commande introuvable");
    }

    if (Array.isArray(lines)) {
      const [existing] = await connection.query(
        `SELECT id, product_id, quantity_ready, quantity_shipped
         FROM order_products
         WHERE order_id = ?`,
        [orderId]
      );

      const existingById = new Map(existing.map((x) => [x.id, x]));
      const incomingIds = new Set(lines.filter((l) => l.id).map((l) => l.id));

      // 1) Suppressions (lignes absentes du payload)
      for (const ex of existing) {
        if (!incomingIds.has(ex.id)) {
          if (
            Number(ex.quantity_ready) > 0 ||
            Number(ex.quantity_shipped) > 0
          ) {
            throw new Error(
              "Impossible de supprimer une ligne déjà en préparation/expédiée."
            );
          }

          const [del] = await connection.query(
            `DELETE FROM order_products WHERE id = ? AND order_id = ? LIMIT 1`,
            [ex.id, orderId]
          );
          if (del.affectedRows === 0)
            throw new Error("Suppression ligne impossible");
        }
      }

      // 2) Updates + Inserts
      for (const l of lines) {
        if (l.id) {
          const ex = existingById.get(l.id);
          if (!ex) throw new Error("Ligne inconnue (id invalide).");

          const ready = Number(ex.quantity_ready || 0);
          const shipped = Number(ex.quantity_shipped || 0);

          if (l.quantity < ready || l.quantity < shipped) {
            throw new Error(
              "Quantité commandée ne peut pas être < quantité prête/expédiée."
            );
          }

          if (
            Number(ex.product_id) !== Number(l.productId) &&
            (ready > 0 || shipped > 0)
          ) {
            throw new Error(
              "Impossible de remplacer un produit sur une ligne déjà en préparation/expédiée."
            );
          }

          const [up] = await connection.query(
            `UPDATE order_products
             SET product_id = ?, quantity_ordered = ?
             WHERE id = ? AND order_id = ?
             LIMIT 1`,
            [l.productId, l.quantity, l.id, orderId]
          );
          if (up.affectedRows === 0)
            throw new Error("Mise à jour ligne impossible");
        } else {
          await connection.query(
            `INSERT INTO order_products (order_id, product_id, quantity_ordered, quantity_ready, quantity_shipped)
             VALUES (?, ?, ?, 0, 0)`,
            [orderId, l.productId, l.quantity]
          );
        }
      }

      await connection.query(
        `UPDATE orders
        SET production_validated_at = NULL
        WHERE id = ? LIMIT 1`,
        [orderId]
      );

      // 3) Recalcul statut production APRÈS sync complète
      await recalcAndUpdateProductionStatus(connection, orderId);
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Liste des commandes à produire (Production).
 * Filtre : production_status IN ('A_PROD','PROD_PARTIELLE') + is_archived = 0
 * @param {{q?:string|null, limit?:number, offset?:number}} filters
 * @returns {Promise<object[]>}
 */
async function findProductionOrders({ q = null, limit = 50, offset = 0 } = {}) {
  const where = [
    "o.is_archived = 0",
    `(
      o.production_status IN ('A_PROD','PROD_PARTIELLE')
      OR (o.production_status = 'PROD_COMPLETE' AND o.production_validated_at IS NULL)
    )`,
  ];
  const params = [];

  if (q) {
    where.push("(o.arc LIKE ? OR o.client_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  const sql = `
    SELECT
      o.id,
      o.arc,
      o.client_name,
      o.order_date,
      o.pickup_date,
      o.priority,
      o.production_status,
      o.expedition_status,
      o.created_at,
      o.production_validated_at
    FROM orders o
    WHERE ${where.join(" AND ")}
    ORDER BY
      CASE o.priority
        WHEN 'URGENT' THEN 1
        WHEN 'INTERMEDIAIRE' THEN 2
        WHEN 'NORMAL' THEN 3
        ELSE 99
      END ASC,
        (o.pickup_date IS NULL) ASC,
        o.pickup_date ASC,
        o.created_at DESC
      LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Recalcule le production_status d'une commande à partir des lignes (ready vs ordered)
 * et met à jour orders.production_status.
 *
 * @param {import("mysql2/promise").PoolConnection} connection
 * @param {number} orderId
 * @returns {Promise<"A_PROD"|"PROD_PARTIELLE"|"PROD_COMPLETE">}
 */
async function recalcAndUpdateProductionStatus(connection, orderId) {
  const [aggRows] = await connection.query(
    `
    SELECT
      SUM(
        CASE
          WHEN COALESCE(quantity_ready, 0) >= COALESCE(quantity_ordered, 0)
          THEN 1 ELSE 0
        END
      ) AS ready_lines,
      COUNT(*) AS total_lines,
      SUM(COALESCE(quantity_ready, 0)) AS sum_ready
    FROM order_products
    WHERE order_id = ?
    `,
    [orderId]
  );

  const { ready_lines = 0, total_lines = 0, sum_ready = 0 } = aggRows[0] || {};

  let productionStatus = "A_PROD";
  if (Number(total_lines) > 0 && Number(ready_lines) === Number(total_lines)) {
    productionStatus = "PROD_COMPLETE";
  } else if (Number(sum_ready) > 0) {
    productionStatus = "PROD_PARTIELLE";
  }

  await connection.query(
    `UPDATE orders SET production_status = ? WHERE id = ? LIMIT 1`,
    [productionStatus, orderId]
  );

  return productionStatus;
}

function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(Math.max(Math.trunc(v), min), max);
}

/**
 * Met à jour la quantité prête d'une ligne (order_products.quantity_ready),
 * invalide la validation de production, puis recalcule orders.production_status.
 */
async function updateOrderLineReady(orderId, lineId, readyQty) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1) Vérifie la ligne et récupère la quantité commandée
    const [lineRows] = await connection.query(
      `
      SELECT quantity_ordered
      FROM order_products
      WHERE id = ? AND order_id = ?
      LIMIT 1
      `,
      [lineId, orderId]
    );

    if (lineRows.length === 0) {
      await connection.rollback();
      return { notFound: true };
    }

    const ordered = Number(lineRows[0].quantity_ordered || 0);
    const shipped = Number(lineRows[0].quantity_shipped || 0);
    const nextReady = clampInt(readyQty, shipped, ordered);

    // 2) Update quantity_ready
    await connection.query(
      `
      UPDATE order_products
      SET quantity_ready = ?
      WHERE id = ? AND order_id = ?
      LIMIT 1
      `,
      [nextReady, lineId, orderId]
    );

    // 3) Toucher au ready invalide une validation précédente
    await connection.query(
      `UPDATE orders SET production_validated_at = NULL WHERE id = ? LIMIT 1`,
      [orderId]
    );

    // 4) Recalc statut production
    const productionStatus = await recalcAndUpdateProductionStatus(
      connection,
      orderId
    );

    // 5) Commit (sinon rien n'est persisté)
    await connection.commit();

    // 6) Retourne order + lines (utile côté front)
    const order = await findOrderById(orderId);
    const lines = await findOrderLinesByOrderId(orderId);

    return { status: "updated", productionStatus, order, lines };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Recalcule expedition_status à partir des shipped vs ordered
 * et met à jour orders.expedition_status.
 */
async function recalcAndUpdateExpeditionStatus(connection, orderId) {
  const [aggRows] = await connection.query(
    `
    SELECT
      SUM(COALESCE(quantity_ordered, 0)) AS sum_ordered,
      SUM(COALESCE(quantity_shipped, 0)) AS sum_shipped
    FROM order_products
    WHERE order_id = ?
    `,
    [orderId]
  );

  const { sum_ordered = 0, sum_shipped = 0 } = aggRows[0] || {};

  let expeditionStatus = "NON_EXPEDIEE";
  if (Number(sum_shipped) > 0 && Number(sum_shipped) < Number(sum_ordered)) {
    expeditionStatus = "EXP_PARTIELLE";
  } else if (
    Number(sum_ordered) > 0 &&
    Number(sum_shipped) === Number(sum_ordered)
  ) {
    expeditionStatus = "EXP_COMPLETE";
  }

  await connection.query(
    `UPDATE orders SET expedition_status = ? WHERE id = ? LIMIT 1`,
    [expeditionStatus, orderId]
  );

  return expeditionStatus;
}

/**
 * Liste production : Expéditions à charger.
 * Règle : commande affichée si au moins une quantité est chargeable
 * (ready > shipped sur au moins une ligne).
 *
 * Ajoute :
 * - chargeable_total = Σ max(0, ready - shipped)
 * - loaded_total     = Σ loaded
 * - loading_status   = TODO | PARTIAL | COMPLETE
 */
async function findProductionShipments({
  q = null,
  limit = 50,
  offset = 0,
} = {}) {
  const where = ["o.is_archived = 0"];
  const params = [];

  if (q) {
    where.push("(o.arc LIKE ? OR o.client_name LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  // ON AFFICHE si chargeable_total > 0 (au moins une ligne ready > shipped)
  const sql = `
    SELECT
      o.id,
      o.arc,
      o.client_name,
      o.order_date,
      o.pickup_date,
      o.priority,
      o.production_status,
      o.expedition_status,
      o.created_at,

      agg.chargeable_total,
      agg.loaded_total,

      CASE
        WHEN agg.loaded_total <= 0 THEN 'TODO'
        WHEN agg.chargeable_total > 0 AND agg.loaded_total >= agg.chargeable_total THEN 'COMPLETE'
        ELSE 'PARTIAL'
      END AS loading_status

    FROM orders o
    JOIN (
      SELECT
        op.order_id,
        SUM(GREATEST(COALESCE(op.quantity_ready,0) - COALESCE(op.quantity_shipped,0), 0)) AS chargeable_total,
        SUM(COALESCE(op.quantity_loaded,0)) AS loaded_total
      FROM order_products op
      GROUP BY op.order_id
    ) agg ON agg.order_id = o.id

    WHERE ${where.join(" AND ")}
      AND agg.chargeable_total > 0

    ORDER BY
      CASE o.priority
        WHEN 'URGENT' THEN 1
        WHEN 'INTERMEDIAIRE' THEN 2
        WHEN 'NORMAL' THEN 3
        ELSE 99
      END ASC,
      (o.pickup_date IS NULL) ASC,
      o.pickup_date ASC,
      o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Met à jour quantity_loaded d'une ligne (chargé camion).
 * Borne : 0 <= loaded <= (ready - shipped)
 */
async function updateOrderLineLoaded(orderId, lineId, loadedQty) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // lock ligne
    const [lineRows] = await connection.query(
      `
      SELECT quantity_ready, quantity_shipped
      FROM order_products
      WHERE id = ? AND order_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [lineId, orderId]
    );

    if (lineRows.length === 0) {
      await connection.rollback();
      return { notFound: true };
    }

    const ready = Number(lineRows[0].quantity_ready || 0);
    const shipped = Number(lineRows[0].quantity_shipped || 0);

    // max chargeable = ready - shipped
    const maxLoadable = Math.max(0, Math.trunc(ready - shipped));
    const nextLoaded = clampInt(loadedQty, 0, maxLoadable);

    await connection.query(
      `
      UPDATE order_products
      SET quantity_loaded = ?
      WHERE id = ? AND order_id = ?
      LIMIT 1
      `,
      [nextLoaded, lineId, orderId]
    );

    await connection.commit();

    // refresh pour le front
    const order = await findOrderById(orderId);
    const lines = await findOrderLinesByOrderId(orderId);

    return { status: "updated", order, lines };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Départ camion : commit ce qui est loaded -> shipped, reset loaded,
 * crée un shipment visible bureau.
 */
async function departTruck(orderId, { createdByUserId = null } = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // lock commande
    const [orderRows] = await connection.query(
      `SELECT id FROM orders WHERE id = ? LIMIT 1 FOR UPDATE`,
      [orderId]
    );
    if (orderRows.length === 0) {
      await connection.rollback();
      return { notFound: true };
    }

    // lock lignes
    const [lines] = await connection.query(
      `
      SELECT
        id,
        product_id,
        product_label_pdf,
        quantity_ordered,
        quantity_ready,
        quantity_shipped,
        quantity_loaded
      FROM order_products
      WHERE order_id = ?
      ORDER BY id ASC
      FOR UPDATE
      `,
      [orderId]
    );

    const loadedLines = lines.filter((l) => Number(l.quantity_loaded || 0) > 0);

    if (loadedLines.length === 0) {
      await connection.rollback();
      const err = new Error(
        "Aucune quantité chargée. Impossible de déclarer un départ camion."
      );
      err.code = 400;
      throw err;
    }

    // 1) create shipment header
    const [shipRes] = await connection.query(
      `
      INSERT INTO shipments (order_id, status, departed_at, created_by)
      VALUES (?, 'IN_TRANSIT', NOW(), ?)
      `,
      [orderId, createdByUserId]
    );
    const shipmentId = shipRes.insertId;

    // 2) create shipment lines
    const shipLineValues = loadedLines.map((l) => [
      shipmentId,
      l.product_id,
      String(l.product_label_pdf || ""),
      Number(l.quantity_loaded || 0),
    ]);

    await connection.query(
      `
      INSERT INTO shipment_lines (shipment_id, product_id, product_label_pdf, quantity_loaded)
      VALUES ?
      `,
      [shipLineValues]
    );

    // 3) commit loaded -> shipped, reset loaded
    await connection.query(
      `
      UPDATE order_products
      SET
        quantity_shipped = quantity_shipped + quantity_loaded,
        quantity_loaded = 0
      WHERE order_id = ?
        AND quantity_loaded > 0
      `,
      [orderId]
    );

    // 4) recalc expedition_status
    const expeditionStatus = await recalcAndUpdateExpeditionStatus(
      connection,
      orderId
    );

    await connection.commit();

    const order = await findOrderById(orderId);
    const freshLines = await findOrderLinesByOrderId(orderId);

    return {
      status: "departed",
      shipmentId,
      expeditionStatus,
      order,
      lines: freshLines,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  findOrderByArc,
  findActiveOrders,
  findOrderById,
  findOrderLinesByOrderId,
  createOrderWithLines,
  createOrderFromPreview,
  updateOrderMetaById,
  deleteOrderById,
  updateOrderAndLinesById,
  findProductionOrders,
  findProductionShipments,
  updateOrderLineReady,
  updateOrderLineLoaded,
  departTruck,
  validateProduction,
};
