// backend/src/routes/events.routes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { addClient } = require("../realtime/productionEvents");

const router = express.Router();

const ALLOWED_ROLES = new Set(["ADMIN", "PRODUCTION"]);

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
  // Toujours renvoyer SSE (200), même si auth KO, pour pouvoir notifier le front.
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

  // Ping pour garder la connexion (proxies)
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
  res.on("close", () => {
    // rien d’autre, mais on garde pour debug si besoin
  });

  // Optionnel : signaler “connected”
  res.write(`event: ready\ndata: {}\n\n`);
});

module.exports = router;
