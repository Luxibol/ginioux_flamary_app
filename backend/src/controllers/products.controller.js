/**
 * @file backend/src/controllers/products.controller.js
 * @description Contrôleur produits : recherche + CRUD catalogue (admin/bureau).
 */
const productsRepository = require("../repositories/products.repository");

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}
function asBool01(v) {
  if (v === true || v === 1 || v === "1") return 1;
  if (v === false || v === 0 || v === "0") return 0;
  return null;
}

/**
 * Recherche de produits (autocomplétion) par libellé PDF.
 * Route: GET /products/search
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function searchProducts(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ data: [] });

    const rows = await productsRepository.searchProducts(q, req.query.limit);
    return res.json({ data: rows });
  } catch (err) {
    console.error("GET /products/search error:", err);
    return res
      .status(500)
      .json({ error: "Erreur lors de la recherche produit" });
  }
}

/**
 * Liste des produits avec filtres + pagination.
 * Route: GET /products
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function listProducts(req, res) {
  try {
    const q = String(req.query.q || "").trim() || null;
    const category =
      String(req.query.category || "")
        .trim()
        .toUpperCase() || null;

    const activeRaw = req.query.active;
    const active = activeRaw === undefined ? null : asBool01(activeRaw);

    const limitRaw = asInt(req.query.limit);
    const offsetRaw = asInt(req.query.offset);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 200)
      : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const filters = { q, category, active, limit, offset };
    const data = await productsRepository.listProducts(filters);

    return res.json({ count: data.length, filters, data });
  } catch (err) {
    console.error("GET /products error:", err);
    return res.status(500).json({ error: "Erreur chargement produits" });
  }
}

/**
 * Crée un produit du catalogue.
 * Route: POST /products
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function createProduct(req, res) {
  try {
    const pdf_label_exact = String(req.body?.pdf_label_exact || "").trim();
    const category = String(req.body?.category || "AUTRE")
      .trim()
      .toUpperCase();
    const weight = Number(req.body?.weight_per_unit_kg);

    if (!pdf_label_exact)
      return res.status(400).json({ error: "Libellé PDF manquant." });
    if (!["BIGBAG", "ROCHE", "AUTRE"].includes(category))
      return res.status(400).json({ error: "Catégorie invalide." });
    if (!Number.isFinite(weight) || weight <= 0)
      return res.status(400).json({ error: "Poids invalide (> 0 attendu)." });

    const is_active =
      req.body?.is_active === undefined ? 1 : asBool01(req.body?.is_active);
    if (is_active === null)
      return res.status(400).json({ error: "is_active invalide." });

    const created = await productsRepository.createProduct({
      pdf_label_exact,
      category,
      weight_per_unit_kg: weight,
      is_active,
    });

    return res.status(201).json({ status: "created", product: created });
  } catch (err) {
    // duplicate label
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Libellé PDF déjà existant." });
    }
    console.error("POST /products error:", err);
    return res.status(500).json({ error: "Erreur création produit" });
  }
}

/**
 * Met à jour partiellement un produit.
 * Route: PATCH /products/:id
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function patchProduct(req, res) {
  try {
    const id = asInt(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ error: "ID invalide." });

    const patch = {};

    if (req.body?.pdf_label_exact !== undefined) {
      const v = String(req.body.pdf_label_exact || "").trim();
      if (!v) return res.status(400).json({ error: "Libellé PDF invalide." });
      patch.pdf_label_exact = v;
    }

    if (req.body?.category !== undefined) {
      const c = String(req.body.category || "")
        .trim()
        .toUpperCase();
      if (!["BIGBAG", "ROCHE", "AUTRE"].includes(c))
        return res.status(400).json({ error: "Catégorie invalide." });
      patch.category = c;
    }

    if (req.body?.weight_per_unit_kg !== undefined) {
      const w = Number(req.body.weight_per_unit_kg);
      if (!Number.isFinite(w) || w <= 0)
        return res.status(400).json({ error: "Poids invalide (> 0 attendu)." });
      patch.weight_per_unit_kg = w;
    }

    if (req.body?.is_active !== undefined) {
      const a = asBool01(req.body.is_active);
      if (a === null)
        return res.status(400).json({ error: "is_active invalide." });
      patch.is_active = a;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à modifier." });
    }

    const updated = await productsRepository.patchProduct(id, patch);
    if (!updated)
      return res.status(404).json({ error: "Produit introuvable." });

    return res.json({ status: "updated", product: updated });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Libellé PDF déjà existant." });
    }
    console.error("PATCH /products/:id error:", err);
    return res.status(500).json({ error: "Erreur mise à jour produit" });
  }
}

/**
 * Supprime un produit si non référencé (sinon 409).
 * Route: DELETE /products/:id
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function deleteProduct(req, res) {
  try {
    const id = asInt(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ error: "ID invalide." });

    const result = await productsRepository.deleteProductIfUnused(id);

    if (result.notFound)
      return res.status(404).json({ error: "Produit introuvable." });

    if (!result.deleted) {
      return res.status(409).json({
        error: "Produit référencé. Supprimé impossible.",
        usage: result.usage,
        hint: "Désactive-le via is_active=0.",
      });
    }

    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    return res.status(500).json({ error: "Erreur suppression produit" });
  }
}

module.exports = {
  searchProducts,
  listProducts,
  createProduct,
  patchProduct,
  deleteProduct,
};
