/**
 * @file backend/src/controllers/ordersUpdate.controller.js
 * @description Contrôleur commandes : mise à jour partielle (métadonnées + synchronisation des lignes).
 */
const ordersRepository = require("../repositories/orders.repository");
const productsRepository = require("../repositories/products.repository");

const ALLOWED_PRIORITIES = ["URGENT", "INTERMEDIAIRE", "NORMAL"];

function isIsoDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * Met à jour partiellement une commande (métadonnées + synchronisation des lignes).
 * Route: PATCH /orders/:id
 * - ARC unique
 * - dates au format YYYY-MM-DD
 * - priority dans une whitelist
 * - lines = état attendu (insert/update/delete), quantité entière >= 0
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
async function patchOrderMeta(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const patch = {};

    if (req.body.arc !== undefined) {
      const arc = String(req.body.arc).trim();
      if (!arc) return res.status(400).json({ error: "ARC invalide" });

      const existing = await ordersRepository.findOrderByArc(arc);
      if (existing && existing.id !== id) {
        return res
          .status(409)
          .json({ error: "ARC déjà utilisé par une autre commande" });
      }

      patch.arc = arc;
    }

    if (req.body.clientName !== undefined) {
      patch.clientName = String(req.body.clientName).trim() || null;
    }

    if (req.body.orderDate !== undefined) {
      const v = req.body.orderDate;
      if (v === null || v === "") {
        return res
          .status(400)
          .json({ error: "orderDate ne peut pas être vide" });
      }
      if (!isIsoDate(v)) {
        return res
          .status(400)
          .json({ error: "orderDate invalide (YYYY-MM-DD attendu)" });
      }
      patch.orderDate = v;
    }

    if (req.body.priority !== undefined) {
      const p = String(req.body.priority).toUpperCase();
      if (!ALLOWED_PRIORITIES.includes(p)) {
        return res.status(400).json({ error: "Priorité invalide" });
      }
      patch.priority = p;
    }

    if (req.body.pickupDate !== undefined) {
      const v = req.body.pickupDate;
      if (v === null || v === "") patch.pickupDate = null;
      else if (!isIsoDate(v)) {
        return res
          .status(400)
          .json({ error: "pickupDate invalide (YYYY-MM-DD attendu)" });
      } else patch.pickupDate = v;
    }

    let lines = null;

    if (req.body.lines !== undefined) {
      if (!Array.isArray(req.body.lines)) {
        return res.status(400).json({ error: "lines doit être un tableau" });
      }

      lines = req.body.lines.map((l) => ({
        id: l.id ? parseInt(l.id, 10) : null,
        productId: l.productId ? parseInt(l.productId, 10) : null,
        label: l.label ? String(l.label).trim() : null,
        quantity: asInt(l.quantity),
      }));

      for (const l of lines) {
        if (l.quantity === null || l.quantity < 0) {
          return res
            .status(400)
            .json({ error: "Quantité invalide (entier >= 0 attendu)" });
        }
      }

      // Si le front envoie un label au lieu d'un productId, on le résout via le catalogue (libellé PDF exact).
      const toResolve = Array.from(
        new Set(
          lines.filter((l) => !l.productId && l.label).map((l) => l.label),
        ),
      );

      if (toResolve.length > 0) {
        const prods =
          await productsRepository.getProductsByPdfLabels(toResolve);
        const map = new Map(prods.map((p) => [p.pdf_label_exact, p.id]));

        for (const l of lines) {
          if (!l.productId && l.label) {
            const pid = map.get(l.label);
            if (!pid) {
              return res.status(400).json({
                error: `Produit introuvable pour libellé: ${l.label}`,
              });
            }
            l.productId = pid;
          }
        }
      }

      for (const l of lines) {
        if (!l.productId) {
          return res.status(400).json({
            error: "Chaque ligne doit avoir productId (ou label resolvable)",
          });
        }
      }
    }

    if (Object.keys(patch).length === 0 && lines === null) {
      return res.status(400).json({ error: "Aucun champ à modifier" });
    }

    // `lines` représente l'état attendu : le repository synchronise insert/update/delete dans une transaction.
    await ordersRepository.updateOrderAndLinesById(id, patch, lines);

    const order = await ordersRepository.findOrderById(id);
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const updatedLines = await ordersRepository.findOrderLinesByOrderId(id);
    return res.json({ status: "updated", order, lines: updatedLines });
  } catch (err) {
    // Conversion des erreurs repository (règles métier) en codes HTTP lisibles côté front.
    console.error("PATCH /orders/:id error:", err);

    if (err.message?.includes("introuvable")) {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.message?.includes("Impossible de supprimer") ||
      err.message?.includes("Impossible de remplacer") ||
      err.message?.includes("< quantité")
    ) {
      return res.status(409).json({ error: err.message });
    }

    return res.status(500).json({
      error: err.message || "Erreur lors de la mise à jour.",
    });
  }
}

module.exports = { patchOrderMeta };
