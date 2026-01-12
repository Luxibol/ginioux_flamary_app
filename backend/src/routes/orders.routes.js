/**
 * Routes commandes
 * - GET  /orders/active : liste des commandes actives (filtres + pagination)
 * - GET  /orders/production : liste des commandes côté production (à produire + complètes non validées)
 * - PATCH /orders/:orderId/lines/:lineId/ready : MAJ quantité prête d'une ligne
 * - POST /orders/:id/production-validate : validation manuelle de fin de production
 * - GET  /orders/:id : détails d'une commande + lignes
 * - PATCH /orders/:id : mise à jour des champs + lignes
 * - DELETE /orders/:id : suppression d'une commande
 */
const express = require("express");

const ordersController = require("../controllers/orders.controller");
const orderDetailsController = require("../controllers/orderDetails.controller");
const ordersUpdateController = require("../controllers/ordersUpdate.controller");
const ordersDeleteController = require("../controllers/ordersDelete.controller");
const productionController = require("../controllers/production.controller");

const router = express.Router();

router.get("/production", productionController.getProductionOrders);
router.patch(
  "/:orderId/lines/:lineId/ready",
  productionController.patchOrderLineReady
);
router.get("/active", ordersController.getActiveOrders);
router.get("/:id", orderDetailsController.getOrderDetails);
router.patch("/:id", ordersUpdateController.patchOrderMeta);
router.delete("/:id", ordersDeleteController.deleteOrder);
router.post(
  "/:id/production-validate",
  ordersController.postProductionValidate
);

module.exports = router;
