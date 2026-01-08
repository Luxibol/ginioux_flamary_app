/**
 * Routes produits
 * - GET /products/search?q=... : recherche de produits (par libellé PDF)
 */
const express = require("express");
const productsController = require("../controllers/products.controller");

const router = express.Router();

router.get("/search", productsController.searchProducts);

module.exports = router;
