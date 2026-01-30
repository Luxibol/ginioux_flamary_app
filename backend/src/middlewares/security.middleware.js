/**
 * @file backend/src/middlewares/security.middleware.js
 * @description Middlewares sécurité : CORS (allowlist), Helmet, HPP, rate-limit, limites payload.
 */
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

/**
 * Construit les options CORS à partir de CORS_ORIGINS.
 * - Dev : si CORS_ORIGINS est vide, autorise toutes les origins (pratique en local).
 * - Prod : si CORS_ORIGINS est vide, refuse (config obligatoire).
 * @returns {import("cors").CorsOptions}
 */
function buildCorsOptions() {
  const raw = String(process.env.CORS_ORIGINS || "");
  const allowList = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true);

      if (process.env.NODE_ENV !== "production" && allowList.length === 0) {
        return cb(null, true);
      }

      if (process.env.NODE_ENV === "production" && allowList.length === 0) {
        return cb(
          new Error("CORS non configuré (CORS_ORIGINS manquant)"),
          false,
        );
      }

      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error("Origin non autorisée par CORS"), false);
    },

    credentials: true,

    // Préflight OPTIONS + liste explicite des méthodes/headers acceptés.
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],

    // Optionnel : headers exposés au front (si besoin).
    // exposedHeaders: ["Content-Length"],
  };
}

/**
 * Enregistre les middlewares de sécurité globaux sur l'app Express.
 * @param {import("express").Express} app
 * @returns {void}
 */
function applySecurity(app) {
  // Requis derrière proxy (Render, etc.) pour IP / rate-limit correct.
  app.set("trust proxy", 1);

  // Masque le header "X-Powered-By".
  app.disable("x-powered-by");

  // Protège contre la pollution des paramètres (hpp).
  app.use(hpp());

  // Headers de sécurité (API-only : CSP désactivée).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // CORS
  app.use(cors(buildCorsOptions()));

  // Rate limit global (anti-abus).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 3000, // Valeur volontairement large (API interne) : ajuster si besoin.
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.method === "OPTIONS",
    }),
  );

  // Limites de payload (anti-DoS).
  app.use(require("express").json({ limit: "1mb" }));
  app.use(require("express").urlencoded({ extended: false, limit: "1mb" }));
}

module.exports = { applySecurity };
