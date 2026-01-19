const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

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

    // important (preflight OPTIONS)
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],

    // si un jour on veux lire des headers côté front
    // exposedHeaders: ["Content-Length"],
  };
}

function applySecurity(app) {
  // utile en prod derrière proxy (Render, etc.)
  app.set("trust proxy", 1);

  // masque Express
  app.disable("x-powered-by");

  // bloque certaines attaques param pollution
  app.use(hpp());

  // headers sécurité (API-only: CSP pas indispensable)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // CORS
  app.use(cors(buildCorsOptions()));

  // rate limit global
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600, // à ajuster si besoin
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // limites payload
  app.use(require("express").json({ limit: "1mb" }));
  app.use(require("express").urlencoded({ extended: false, limit: "1mb" }));
}

module.exports = { applySecurity };
