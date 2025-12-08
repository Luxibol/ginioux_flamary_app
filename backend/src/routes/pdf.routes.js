// src/routes/pdf.routes.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { parseOrderFromPdfText } = require("../services/pdfParsing.service");

const router = express.Router();

// On stocke le fichier en mémoire (RAM), pas sur le disque.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // limite à 10 Mo
  },
});

// POST /pdf/upload
// Body: form-data avec un champ "file" contenant le PDF
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // 1) Vérifier qu'on a bien reçu un fichier
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'Aucun fichier fourni (champ "file" manquant)' });
    }

    // 2) Lire le PDF avec pdf-parse
    const parsedPdf = await pdfParse(req.file.buffer);
    const text = parsedPdf.text || "";
    const pages = parsedPdf.numpages || 0;

    // 3) Appliquer notre parsing métier
    const order = parseOrderFromPdfText(text);

    // 4) Réponse : on renvoie le parsing + un petit bout du texte brut pour debug
    res.json({
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      pages,
      rawPreview: text.slice(0, 800),
      parsedOrder: order,
    });
  } catch (err) {
    console.error("Erreur lecture PDF:", err);
    res.status(500).json({
      error: "Erreur lors de la lecture du PDF",
      details: err.message,
    });
  }
});

module.exports = router;
