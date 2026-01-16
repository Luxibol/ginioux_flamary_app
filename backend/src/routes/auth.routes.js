const express = require("express");
const { login, changePassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", login);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
