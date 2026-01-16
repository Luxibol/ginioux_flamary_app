/**
 * Routes produits
 * - GET /products/search?q=... : recherche de produits (par libellé PDF)
 */
const express = require("express");
const productsController = require("../controllers/products.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

router.use(requireAuth);

// search : connecté (ADMIN/BUREAU/PRODUCTION)
router.get("/search", productsController.searchProducts);

// admin products : connecté + rôle (ADMIN ou BUREAU)
router.get(
  "/",
  requireRole("ADMIN", "BUREAU"),
  productsController.listProducts
);
router.post(
  "/",
  requireRole("ADMIN", "BUREAU"),
  productsController.createProduct
);
router.patch(
  "/:id",
  requireRole("ADMIN", "BUREAU"),
  productsController.patchProduct
);
router.delete(
  "/:id",
  requireRole("ADMIN", "BUREAU"),
  productsController.deleteProduct
);

module.exports = router;
