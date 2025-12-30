// src/routes/pdf.routes.js
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
 * -> retourne importId + preview (aucune écriture BDD)
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
      .map((p) => p.pdfLabel)
      .filter(Boolean);
    const products = await productsRepository.getProductsByPdfLabels(labels);
    const found = new Set(products.map((p) => p.pdf_label_exact));

    const missingLabels = labels.filter((l) => !found.has(l));

    if (missingLabels.length > 0) {
      return res.status(422).json({
        error: "Produits introuvables en base pour certains libellés PDF.",
        missingLabels,
        preview, // voir ce que le PDF contient
      });
    }

    // Preview "vide" => parsing impossible
    if (!preview || !preview.arc) {
      return res.status(422).json({
        error: "Parsing impossible (ARC introuvable).",
        parsed: preview,
      });
    }

    // Dédoublonnage: on check l'ARC maintenant pour afficher un warning côté front
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
 * body JSON: { preview, internalComment }
 * -> écrit en BDD UNIQUEMENT ici
 */
router.post("/:importId/confirm", async (req, res) => {
  try {
    const { importId } = req.params;
    const stored = getPreview(importId);

    if (!stored) {
      return res.status(404).json({ error: "Preview introuvable ou expirée" });
    }

    // On prend la preview envoyée par le front (modifiée) si présente, sinon celle stockée
    const preview = req.body?.preview ?? stored.preview;
    const internalComment = req.body?.internalComment ?? null;

    // IMPORTANT: ici seulement on écrit en BDD
    const result = await ordersRepository.createOrderFromPreview(preview, {
      createdByUserId: null, // plus tard mettre req.user.id
    });

    // Nettoyage du preview
    previewStore.delete(importId);

    // Si doublon => skipped
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
      internalCommentSaved: Boolean(internalComment), // (utilisé plus tard)
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

    res
      .status(500)
      .json({ error: "Erreur lors de la validation", details: err.message });
  }
});

/**
 * DELETE /pdf/:importId
 * -> annule une preview (si l’utilisateur ferme la modale)
 */
router.delete("/:importId", (req, res) => {
  previewStore.delete(req.params.importId);
  return res.status(204).send();
});

module.exports = router;
