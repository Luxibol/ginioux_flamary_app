const express = require("express");

const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

const ordersController = require("../controllers/orders.controller");
const orderDetailsController = require("../controllers/orderDetails.controller");
const ordersUpdateController = require("../controllers/ordersUpdate.controller");
const ordersDeleteController = require("../controllers/ordersDelete.controller");
const productionController = require("../controllers/production.controller");
const shipmentsBureauController = require("../controllers/shipmentsBureau.controller");
const historyController = require("../controllers/history.controller");
const orderShipmentsController = require("../controllers/orderShipments.controller");

const router = express.Router();

// Toutes les routes /orders sont protégées
router.use(requireAuth);

/* =========================
   PRODUCTION (ADMIN + PRODUCTION)
========================= */
router.get(
  "/production",
  requireRole("ADMIN", "PRODUCTION"),
  productionController.getProductionOrders
);

// Production - Expéditions à charger
router.get(
  "/shipments",
  requireRole("ADMIN", "PRODUCTION"),
  productionController.getProductionShipments
);
router.patch(
  "/:orderId/lines/:lineId/loaded",
  requireRole("ADMIN", "PRODUCTION"),
  productionController.patchOrderLineLoaded
);
router.post(
  "/:orderId/shipments/depart",
  requireRole("ADMIN", "PRODUCTION"),
  productionController.postDepartTruck
);

router.patch(
  "/:orderId/lines/:lineId/ready",
  requireRole("ADMIN", "PRODUCTION"),
  productionController.patchOrderLineReady
);
router.post(
  "/:id/production-validate",
  requireRole("ADMIN", "PRODUCTION"),
  ordersController.postProductionValidate
);

router.get(
  "/produced",
  requireRole("ADMIN"),
  productionController.getProducedCount
);

/* =========================
   MIXTE (ADMIN + BUREAU + PRODUCTION)
========================= */
router.get(
  "/:id/shipments",
  requireRole("ADMIN", "BUREAU", "PRODUCTION"),
  orderShipmentsController.getOrderShipments
);

/* =========================
   BUREAU (ADMIN + BUREAU)
========================= */
router.get(
  "/active",
  requireRole("ADMIN", "BUREAU"),
  ordersController.getActiveOrders
);

// Bureau - Expéditions (à accuser réception)
router.get(
  "/bureau/shipments/pending",
  requireRole("ADMIN", "BUREAU"),
  shipmentsBureauController.getPending
);
router.post(
  "/:orderId/shipments/ack",
  requireRole("ADMIN", "BUREAU"),
  shipmentsBureauController.postAckForOrder
);

// Bureau - Historique
router.get(
  "/archived",
  requireRole("ADMIN", "BUREAU"),
  historyController.getArchivedOrders
);
router.get(
  "/:id/history",
  requireRole("ADMIN", "BUREAU"),
  historyController.getArchivedOrderHistory
);

// Détails + édition + suppression
router.get(
  "/:id",
  requireRole("ADMIN", "BUREAU"),
  orderDetailsController.getOrderDetails
);
router.patch(
  "/:id",
  requireRole("ADMIN", "BUREAU"),
  ordersUpdateController.patchOrderMeta
);
router.delete(
  "/:id",
  requireRole("ADMIN", "BUREAU"),
  ordersDeleteController.deleteOrder
);

module.exports = router;
