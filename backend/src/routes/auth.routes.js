/**
 * @file backend/src/routes/auth.routes.js
 * @description Routes /auth : login, refresh, logout, changement de mot de passe (rate-limit login).
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  login,
  changePassword,
  refresh,
  logout,
} = require("../controllers/auth.controller");

const router = express.Router();

// Protection brute-force : limite les tentatives de connexion.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
