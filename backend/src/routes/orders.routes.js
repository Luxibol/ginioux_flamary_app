const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const { parseOrderFromPdfText } = require("../services/pdfParsing.service");
const {
  getProductsByPdfLabels,
} = require("../repositories/products.repository");
const {
  findOrderByArc,
  createOrderWithLines,
} = require("../repositories/orders.repository");

const router = express.Router();

// Upload en mémoire (comme pour /pdf/upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * POST /orders/import-from-pdf
 *
 * Body (form-data):
 * - file : PDF
 * - priority : "URGENT" | "INTERMEDIAIRE" | "NORMAL" (optionnel, défaut NORMAL)
 * - pickupDate : "YYYY-MM-DD" (optionnel)
 * - createdByUserId : id de l'utilisateur créateur (optionnel pour l'instant)
 */
router.post("/import-from-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'Aucun fichier fourni (champ "file" manquant)' });
    }

    // Récup des options venant du front (plus tard via l’écran de validation)
    const priorityRaw = (req.body.priority || "").toUpperCase();
    const allowedPriorities = ["URGENT", "INTERMEDIAIRE", "NORMAL"];
    const priority = allowedPriorities.includes(priorityRaw)
      ? priorityRaw
      : "NORMAL";

    const pickupDateRaw = req.body.pickupDate || null;
    const pickupDate =
      pickupDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(pickupDateRaw)
        ? pickupDateRaw
        : null;

    const createdByUserId = req.body.createdByUserId
      ? parseInt(req.body.createdByUserId, 10)
      : null;

    // 1) Lecture du PDF
    const parsedPdf = await pdfParse(req.file.buffer);
    const text = parsedPdf.text || "";

    // 2) Parsing métier (ARC, client, date, produits)
    const parsedOrder = parseOrderFromPdfText(text);

    if (!parsedOrder.arc) {
      return res.status(400).json({
        error: "ARC introuvable dans le PDF",
      });
    }

    if (!parsedOrder.orderDate) {
      return res.status(400).json({
        error: "Date de commande introuvable dans le PDF",
      });
    }

    if (!parsedOrder.products || parsedOrder.products.length === 0) {
      return res.status(400).json({
        error: "Aucun produit détecté dans le PDF",
      });
    }

    // 3) Vérifier qu'on n'a pas déjà une commande avec cet ARC
    const existing = await findOrderByArc(parsedOrder.arc);
    if (existing) {
      return res.status(409).json({
        error: "Une commande existe déjà pour cet ARC",
        arc: parsedOrder.arc,
      });
    }

    // 4) Vérifier que tous les produits existent dans le catalogue
    const labels = parsedOrder.products.map((p) => p.pdfLabel);
    const dbProducts = await getProductsByPdfLabels(labels);

    const productByLabel = new Map();
    for (const p of dbProducts) {
      productByLabel.set(p.pdf_label_exact, p);
    }

    const missingProducts = [];
    const linesForInsert = [];

    for (const p of parsedOrder.products) {
      const dbProd = productByLabel.get(p.pdfLabel);
      if (!dbProd) {
        missingProducts.push(p.pdfLabel);
        continue;
      }

      linesForInsert.push({
        productId: dbProd.id,
        quantity: p.quantity,
      });
    }

    if (missingProducts.length > 0) {
      return res.status(400).json({
        error:
          "Certains produits du PDF n'existent pas dans le catalogue. La commande n'a pas été créée.",
        missingProducts,
      });
    }

    // 5) Tout est OK, on crée la commande + lignes dans une transaction
    const orderData = {
      arc: parsedOrder.arc,
      clientName: parsedOrder.clientName || null,
      orderDate: parsedOrder.orderDate, // "YYYY-MM-DD"
      pickupDate,
      priority, // "URGENT" | "INTERMEDIAIRE" | "NORMAL"
      productionStatus: "A_PROD", // statut initial côté atelier
      expeditionStatus: "NON_EXPEDIEE",
      createdByUserId,
    };

    const orderId = await createOrderWithLines(orderData, linesForInsert);

    return res.status(201).json({
      status: "created",
      orderId,
      arc: parsedOrder.arc,
      productsCount: linesForInsert.length,
    });
  } catch (err) {
    console.error("Erreur import commande depuis PDF:", err);
    return res.status(500).json({
      error: "Erreur interne lors de l'import de la commande",
      details: err.message,
    });
  }
});

module.exports = router;
