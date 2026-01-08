/**
 * Routes commandes
 * - GET /orders/active : liste des commandes actives (filtres + pagination)
 * - GET /orders/:id : détails d'une commande + lignes
 * - PATCH /orders/:id : mise à jour des champs + lignes
 * - DELETE /orders/:id : suppression d'une commande
 */
const express = require("express");

const ordersController = require("../controllers/orders.controller");
const orderDetailsController = require("../controllers/orderDetails.controller");
const ordersUpdateController = require("../controllers/ordersUpdate.controller");
const ordersDeleteController = require("../controllers/ordersDelete.controller");

const router = express.Router();

router.get("/active", ordersController.getActiveOrders);
router.get("/:id", orderDetailsController.getOrderDetails);
router.patch("/:id", ordersUpdateController.patchOrderMeta);
router.delete("/:id", ordersDeleteController.deleteOrder);

module.exports = router;
