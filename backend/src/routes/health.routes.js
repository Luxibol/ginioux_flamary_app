/**
 * @file backend/src/routes/health.routes.js
 * @description Health checks : API OK + probe DB.
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
