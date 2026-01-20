/**
 * @file backend/src/routes/adminUsers.routes.js
 * @description Routes /admin/users : gestion utilisateurs (ADMIN uniquement).
 */
const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/adminUsers.controller");

const router = express.Router();

// Accès réservé ADMIN (auth + RBAC).
router.use(requireAuth, requireRole("ADMIN"));

/* === CRUD utilisateurs === */
router.get("/", ctrl.listUsers);
router.post("/", ctrl.createUser);
router.patch("/:id", ctrl.patchUser);
router.post("/:id/reset-password", ctrl.resetPassword);

module.exports = router;
