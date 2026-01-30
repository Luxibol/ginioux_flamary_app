/**
 * @file backend/src/routes/events.routes.js
 * @description Endpoint SSE pour la Production (auth via token en query) + inscription au hub temps réel.
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const { addClient } = require("../realtime/productionEvents");

const router = express.Router();

// SSE réservé aux rôles pouvant accéder aux écrans Production.
const ALLOWED_ROLES = new Set(["ADMIN", "PRODUCTION"]);

/**
 * Valide un access token passé en query (?access_token=...).
 * Objectif : authentifier un flux SSE sans header Authorization (EventSource limitations côté navigateur).
 * @param {import("express").Request} req
 * @returns {{ ok: true, user: { id: string | number, role: string } } | { ok: false, reason: string }}
 */
function verifyTokenFromQuery(req) {
  const token = String(req.query.access_token || "").trim();
  if (!token) return { ok: false, reason: "Token manquant" };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { ok: false, reason: "JWT_SECRET manquant" };

  try {
    const payload = jwt.verify(token, secret);
    const userId = payload?.sub;
    const role = payload?.role;

    if (!userId || !ALLOWED_ROLES.has(role)) {
      return { ok: false, reason: "Token invalide" };
    }
    return { ok: true, user: { id: userId, role } };
  } catch {
    return { ok: false, reason: "Token invalide/expiré" };
  }
}

router.get("/production", (req, res) => {
  // Toujours répondre en SSE (200) pour que le front reçoive un event d'erreur d'auth au lieu d'un échec réseau.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const verif = verifyTokenFromQuery(req);
  if (!verif.ok) {
    res.write(
      `event: auth_error\ndata: ${JSON.stringify({ error: verif.reason })}\n\n`,
    );
    return res.end();
  }

  // Ping périodique pour éviter que des proxies/serveurs ferment une connexion SSE inactive.
  const ping = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {}
  }, 25000);

  res.on("close", () => {
    clearInterval(ping);
  });

  // Ajout au hub
  addClient(res);

  // Signal “ready” pour confirmer au front que le flux SSE est établi.
  res.write(`event: ready\ndata: {}\n\n`);
});

module.exports = router;
