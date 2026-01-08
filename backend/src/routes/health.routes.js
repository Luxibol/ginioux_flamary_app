/**
 * Routes de santé (health checks)
 * - GET /health : vérifie que l'API répond
 * - GET /health/db : vérifie la connectivité à la base de données
 */
const express = require("express");
const { testConnection } = require("../config/db");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

router.get("/db", async (req, res) => {
  try {
    const ok = await testConnection();
    res.json({ db: ok ? "ok" : "ko" });
  } catch (err) {
    console.error("Erreur connexion DB:", err);
    res.status(500).json({ db: "ko", error: err.message });
  }
});

module.exports = router;
