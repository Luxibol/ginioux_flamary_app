/**
 * @file backend/src/app.js
 * @description Configuration Express : middlewares, routes, gestion erreurs.
 */
const express = require("express");

const healthRoutes = require("./routes/health.routes");
const pdfRoutes = require("./routes/pdf.routes");
const ordersRoutes = require("./routes/orders.routes");
const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");
const adminUsersRoutes = require("./routes/adminUsers.routes");
const cookieParser = require("cookie-parser");
const eventsRoutes = require("./routes/events.routes");

const { applySecurity } = require("./middlewares/security.middleware");

const app = express();
// Middlewares de sécurité globaux (CORS, headers, rate-limit, etc.).
applySecurity(app);
// Lecture des cookies (auth via cookies httpOnly, ex: refresh token).
app.use(cookieParser());

// Routes API
app.use("/events", eventsRoutes);

app.use("/admin/users", adminUsersRoutes);
app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/pdf", pdfRoutes);
app.use("/orders", ordersRoutes);
app.use("/products", productsRoutes);

/**
 * Normalise les erreurs CORS en réponse JSON 403 (plutôt qu'une erreur générique).
 */
app.use((err, req, res, next) => {
  const msg = String(err?.message || "");
  if (
    msg.includes("Origin non autorisée par CORS") ||
    msg.includes("CORS non configuré")
  ) {
    return res.status(403).json({ error: msg });
  }
  return next(err);
});

/**
 * Handler d'erreur global : log serveur + 500 JSON.
 */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});

module.exports = app;
