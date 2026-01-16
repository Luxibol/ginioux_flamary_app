const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/adminUsers.controller");

const router = express.Router();

// ADMIN only
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", ctrl.listUsers);
router.post("/", ctrl.createUser);
router.patch("/:id", ctrl.patchUser);
router.post("/:id/reset-password", ctrl.resetPassword);

module.exports = router;
