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
const shipmentsBureauController = require("../controllers/shipmentsBureau.controller");
const historyController = require("../controllers/history.controller");

const router = express.Router();

router.get("/production", productionController.getProductionOrders);

// Production - Expéditions à charger
router.get("/shipments", productionController.getProductionShipments);
router.patch(
  "/:orderId/lines/:lineId/loaded",
  productionController.patchOrderLineLoaded
);
router.post("/:orderId/shipments/depart", productionController.postDepartTruck);

router.patch(
  "/:orderId/lines/:lineId/ready",
  productionController.patchOrderLineReady
);
router.get("/active", ordersController.getActiveOrders);

router.post(
  "/:id/production-validate",
  ordersController.postProductionValidate
);

// Bureau - Expéditions (à accuser réception)
router.get("/bureau/shipments/pending", shipmentsBureauController.getPending);
router.post(
  "/:orderId/shipments/ack",
  shipmentsBureauController.postAckForOrder
);

// Bureau - Historique (commandes archivées)
router.get("/archived", historyController.getArchivedOrders);
router.get("/:id/history", historyController.getArchivedOrderHistory);

router.get("/:id", orderDetailsController.getOrderDetails);
router.patch("/:id", ordersUpdateController.patchOrderMeta);
router.delete("/:id", ordersDeleteController.deleteOrder);

module.exports = router;
