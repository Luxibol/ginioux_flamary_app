/**
 * Routes produits
 * - GET /products/search?q=... : recherche de produits (par libellé PDF)
 */
const express = require("express");
const productsController = require("../controllers/products.controller");

const router = express.Router();

router.get("/search", productsController.searchProducts);

router.get("/", productsController.listProducts);
router.post("/", productsController.createProduct);
router.patch("/:id", productsController.patchProduct);
router.delete("/:id", productsController.deleteProduct);

module.exports = router;
