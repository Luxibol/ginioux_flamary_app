const express = require("express");
const { login, changePassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 tentatives / 15min / IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
