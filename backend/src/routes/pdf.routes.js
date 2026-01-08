/**
 * Routes d'import PDF
 * - /pdf/preview : analyse le PDF et renvoie une prévisualisation (aucune écriture en base)
 * - /pdf/:importId/confirm : valide la prévisualisation et crée la commande en base
 * - /pdf/:importId (DELETE) : annule une prévisualisation
 *
 * Note : les prévisualisations sont stockées en mémoire (Map) avec TTL.
 */

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const crypto = require("crypto");
const { parseOrderFromPdfText } = require("../services/pdfParsing.service");
const ordersRepository = require("../repositories/orders.repository");
const productsRepository = require("../repositories/products.repository");

const router = express.Router();

const PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutes
const previewStore = new Map();

const norm = (s) => String(s ?? "").trim();

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
 * Valide et normalise la prévisualisation envoyée par le front.
 * Objectif : éviter d'écrire en base des données mal formées ou incohérentes.
 * - ARC obligatoire
 * - orderDate au format YYYY-MM-DD
 * - priorité dans une whitelist
 * - products : tableau, pdfLabel obligatoire, quantity entier >= 0 (0 ignoré)
 */
function sanitizePreview(input) {
  const src = input || {};

  const arc = norm(src.arc);
  if (!arc) return { ok: false, error: "ARC invalide" };

  const orderDate = src.orderDate;
  if (!isIsoDate(orderDate)) {
    return { ok: false, error: "orderDate invalide (YYYY-MM-DD attendu)" };
  }

  const clientName =
    src.clientName !== undefined ? norm(src.clientName) || null : null;

  let priority = "NORMAL";
  if (
    src.priority !== undefined &&
    src.priority !== null &&
    src.priority !== ""
  ) {
    const p = String(src.priority).toUpperCase();
    if (!ALLOWED_PRIORITIES.includes(p))
      return { ok: false, error: "Priorité invalide" };
    priority = p;
  }

  if (!Array.isArray(src.products)) {
    return { ok: false, error: "products doit être un tableau" };
  }

  const products = src.products.map((p) => ({
    pdfLabel: norm(p.pdfLabel),
    quantity: asInt(p.quantity),
  }));

  for (const p of products) {
    if (!p.pdfLabel)
      return { ok: false, error: "pdfLabel manquant sur une ligne" };
    if (p.quantity === null || p.quantity < 0) {
      return { ok: false, error: "Quantité invalide (entier >= 0 attendu)" };
    }
  }

  // On retire les lignes à quantité 0 (équivalent à "supprimé" côté import)
  const cleanedProducts = products.filter((p) => p.quantity > 0);
  if (cleanedProducts.length === 0) {
    return {
      ok: false,
      error: "Au moins une ligne produit avec quantité > 0 est requise",
    };
  }

  return {
    ok: true,
    value: { arc, clientName, orderDate, priority, products: cleanedProducts },
  };
}

// Nettoyage périodique des previews expirées (évite que la Map grossisse indéfiniment)
function cleanupExpiredPreviews() {
  const now = Date.now();
  for (const [id, item] of previewStore.entries()) {
    if (now > item.expiresAt) previewStore.delete(id);
  }
}

// Toutes les 60s : purge des previews expirées (n'empêche pas le process de se fermer)
setInterval(cleanupExpiredPreviews, 60 * 1000).unref?.();

function newImportId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

function storePreview(payload) {
  const importId = newImportId();
  const now = Date.now();
  previewStore.set(importId, {
    ...payload,
    createdAt: now,
    expiresAt: now + PREVIEW_TTL_MS,
  });
  return importId;
}

function getPreview(importId) {
  const item = previewStore.get(importId);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    previewStore.delete(importId);
    return null;
  }
  return item;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
});

/**
 * POST /pdf/preview
 * form-data: file (PDF)
 * Retour : importId + preview + meta
 * Important : aucune écriture en base ici (preview uniquement).
 */
router.post("/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'Aucun fichier fourni (champ "file" manquant)' });
    }

    const parsedPdf = await pdfParse(req.file.buffer);
    const text = parsedPdf.text || "";
    const pages = parsedPdf.numpages || 0;

    const preview = parseOrderFromPdfText(text);
    const labels = (preview.products || [])
      .map((p) => norm(p.pdfLabel))
      .filter(Boolean);

    const products = await productsRepository.getProductsByPdfLabels(labels);
    const found = new Set(products.map((p) => norm(p.pdf_label_exact)));

    const missingLabels = labels.filter((l) => !found.has(norm(l)));

    if (missingLabels.length > 0) {
      return res.status(422).json({
        error: "Produits introuvables en base pour certains libellés PDF.",
        missingLabels,
        preview,
      });
    }

    // Si le parsing ne remonte pas d'ARC, on considère le PDF non exploitable
    if (!preview || !preview.arc) {
      return res.status(422).json({
        error: "Parsing impossible (ARC introuvable).",
        parsed: preview,
      });
    }

    // Détection de doublon : on avertit le front si une commande avec le même ARC existe déjà
    const existing = await ordersRepository.findOrderByArc(preview.arc);

    const importId = storePreview({
      preview,
      meta: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        pages,
        rawPreview: text.slice(0, 800),
      },
    });

    return res.json({
      status: "preview",
      importId,
      preview,
      meta: previewStore.get(importId).meta,
      dedupe: {
        match: Boolean(existing),
        existingOrderId: existing?.id ?? null,
        message: existing
          ? "Commande déjà présente — la validation n’ajoutera rien."
          : null,
      },
      ttlMs: PREVIEW_TTL_MS,
    });
  } catch (err) {
    console.error("Erreur preview PDF:", err);
    res.status(500).json({
      error: "Erreur lors de la lecture du PDF",
      details: err.message,
    });
  }
});

/**
 * POST /pdf/:importId/confirm
 * body: { preview, internalComment }
 * Écrit en base uniquement ici.
 * - preview est entièrement modifiable côté front, mais re-validé côté backend (sanitizePreview).
 */
router.post("/:importId/confirm", async (req, res) => {
  try {
    const { importId } = req.params;
    const stored = getPreview(importId);

    if (!stored) {
      return res.status(404).json({ error: "Preview introuvable ou expirée" });
    }

    const incomingPreview = req.body?.preview;
    const sanitized = sanitizePreview(incomingPreview);

    if (!sanitized.ok) {
      return res.status(400).json({ error: sanitized.error });
    }

    const preview = sanitized.value;
    const internalComment = req.body?.internalComment ?? null;

    const result = await ordersRepository.createOrderFromPreview(preview, {
      createdByUserId: null,
    });

    previewStore.delete(importId);

    if (result.action === "skipped") {
      return res.status(409).json({
        status: "confirmed",
        action: "skipped",
        existingOrderId: result.existingOrderId,
        arc: result.arc,
        message: "Commande déjà existante — aucune création effectuée.",
      });
    }

    return res.json({
      status: "confirmed",
      action: "created",
      orderId: result.orderId,
      arc: result.arc,
      internalCommentSaved: Boolean(internalComment), // internalComment : prévu pour plus tard (ex: table comments), non persisté actuellement
    });
  } catch (err) {
    console.error("Erreur confirm import:", err);

    const code = err.code || 500;
    if (code === 422) {
      return res.status(422).json({
        error: err.message,
        missingLabels: err.missingLabels || null,
      });
    }

    return res
      .status(500)
      .json({ error: "Erreur lors de la validation", details: err.message });
  }
});

/**
 * DELETE /pdf/:importId
 * Annule une prévisualisation (ex: fermeture de la modale côté front).
 */
router.delete("/:importId", (req, res) => {
  previewStore.delete(req.params.importId);
  return res.status(204).send();
});

module.exports = router;
