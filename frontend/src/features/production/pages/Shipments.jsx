/**
 * Production - Expéditions à charger (mobile)
 * - Liste des commandes à charger (cards) via API
 * - Accordéons (détails lazy au clic)
 * - Stepper "Chargés" branché sur PATCH loaded
 * - Bouton "Tout charger" : met loaded = (ready - shipped) sur chaque ligne
 * - Bouton "Départ du camion" : valide le départ et refresh la liste
 * Note : commentaires pas branchés => on garde comments: []
 */
import { useEffect, useRef, useState } from "react";
import ProductionOrderCard from "../components/ProductionOrderCard.jsx";
import {
  getProductionShipments,
  getOrderDetails,
  patchOrderLineLoaded,
  postDepartTruck,
} from "../../../services/orders.api.js";
import { mapOrderDetailsToGroups } from "../mappers/productionOrders.mappers.js";
import {
  asNumber,
  formatDateFR,
  priorityLabel,
} from "../utils/productionOrders.format.js";
import {
  buildMaxLoadableByIdFromLines,
  computeShipmentUiFromLines,
  computeShipmentUiFromTotals,
  injectMinMaxIntoGroups,
  runWithConcurrency,
} from "../utils/productionUi.utils.js";

function Shipments() {
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [loadedByLineId, setLoadedByLineId] = useState({});
  const detailsLoadedRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bulkByOrderId, setBulkByOrderId] = useState({});
  const [departByOrderId, setDepartByOrderId] = useState({});

  const [commentsOpenByOrderId, setCommentsOpenByOrderId] = useState({});

  const applyCounts = (orderId, counts) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              messagesCount: Number(counts?.messagesCount ?? 0),
              unreadCount: Number(counts?.unreadCount ?? 0),
            }
          : o
      )
    );
  };

  function resetDetailsCache() {
    detailsLoadedRef.current = new Set();
    setLoadedByLineId({});
  }

  /**
   * Applique dans l'UI :
   * - groups (avec max)
   * - loaded map (vérité BDD)
   * - totaux + summary (loadedTotal / chargeableTotal)
   */
  function applyOrderUiFromLines(orderId, lines) {
    const list = Array.isArray(lines) ? lines : [];

    // groups + max
    const { groups } = mapOrderDetailsToGroups(list);
    const maxById = buildMaxLoadableByIdFromLines(list);
    const groupsWithMax = injectMinMaxIntoGroups(groups, { maxById });

    // steppers : vérité BDD
    setLoadedByLineId((prev) => {
      const next = { ...prev };
      list.forEach((l) => {
        next[l.id] = asNumber(l.quantity_loaded);
      });
      return next;
    });

    // totaux + labels
    const t = computeShipmentUiFromLines(list);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              groups: groupsWithMax,
              loadedTotal: t.loadedTotal,
              chargeableTotal: t.chargeableTotal,
              summary: `Chargés ${t.loadedTotal}/${t.chargeableTotal}`,
            }
          : o
      )
    );

    return { list, groupsWithMax, totals: t };
  }

  async function refreshList() {
    setLoading(true);
    setError("");

    try {
      const res = await getProductionShipments();
      const data = Array.isArray(res?.data) ? res.data : [];

      const mapped = data.map((o) => {
        const loadedTotal = Number(o.loaded_total ?? 0);
        const chargeableTotal = Number(o.chargeable_total ?? 0);

        return {
          id: o.id,
          company: o.client_name ?? "—",
          arc: o.arc ?? "—",
          pickupDate: formatDateFR(o.pickup_date),
          priority: o.priority ?? "NORMAL",
          priorityLabel: priorityLabel(o.priority),

          // totaux (affichage même carte fermée)
          loadedTotal,
          chargeableTotal,

          messagesCount: Number(o.messagesCount ?? 0),
          unreadCount: Number(o.unreadCount ?? 0),

          groups: [],
          comments: [],
          summary: `Chargés ${loadedTotal}/${chargeableTotal}`,
        };
      });

      setOrders(mapped);
      setExpandedId(null);
      resetDetailsCache();
    } catch {
      setError("Impossible de charger les expéditions à charger.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Charge les détails 1 seule fois par orderId (lazy).
   * Retourne la liste des lignes (utile pour éviter un fetch doublon).
   */
  async function ensureDetails(orderId) {
    if (detailsLoadedRef.current.has(orderId)) return null;
    detailsLoadedRef.current.add(orderId);

    try {
      const { lines } = await getOrderDetails(orderId);
      applyOrderUiFromLines(orderId, lines);
      return Array.isArray(lines) ? lines : [];
    } catch (e) {
      detailsLoadedRef.current.delete(orderId);
      console.error(e);
      return null;
    }
  }

  /** Relit la vérité BDD pour cet orderId et resynchronise UI. */
  async function refreshOrderFromServer(orderId) {
    const fresh = await getOrderDetails(orderId);
    const freshLines = Array.isArray(fresh?.lines) ? fresh.lines : [];
    applyOrderUiFromLines(orderId, freshLines);
    return freshLines;
  }

  return (
    <div className="p-4">
      <h1 className="gf-h1 text-center mb-1">Expéditions à charger</h1>
      <p className="gf-body text-center text-gf-subtitle mb-3">
        Liste des commandes prêtes à charger.
      </p>
      {loading ? (
        <div className="gf-empty">Chargement…</div>
      ) : error ? (
        <div className="gf-error">{error}</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const loadedTotal = Number(order.loadedTotal ?? 0);
            const chargeableTotal = Number(order.chargeableTotal ?? 0);

            const { status: uiStatus, label: uiLabel } =
              computeShipmentUiFromTotals(loadedTotal, chargeableTotal);

            return (
              <ProductionOrderCard
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => {
                  setExpandedId((cur) => {
                    const next = cur === order.id ? null : order.id;

                    // si on ferme -> on ferme aussi commentaires
                    if (next === null) {
                      setCommentsOpenByOrderId((m) => ({ ...m, [order.id]: false }));
                    }

                    if (next === order.id) ensureDetails(order.id);
                    return next;
                  });
                }}
                readyByLineId={loadedByLineId}
                messagesCount={Number(order.messagesCount ?? 0)}
                unreadCount={Number(order.unreadCount ?? 0)}

                commentsOpen={Boolean(commentsOpenByOrderId[order.id])}
                onCommentsOpenChange={(open) =>
                  setCommentsOpenByOrderId((m) => ({ ...m, [order.id]: Boolean(open) }))
                }
                onCountsChange={applyCounts}
                onChangeReady={async (lineId, next) => {
                  // optimistic stepper
                  setLoadedByLineId((prev) => ({ ...prev, [lineId]: next }));

                  try {
                    const res = await patchOrderLineLoaded(order.id, lineId, next);
                    const apiLines = Array.isArray(res?.lines) ? res.lines : [];
                    applyOrderUiFromLines(order.id, apiLines);
                  } catch {
                    // resync complet (groups + totaux + steppers)
                    await refreshOrderFromServer(order.id);
                  }
                }}
                onMarkAllReady={async () => {
                  if (bulkByOrderId[order.id]) return;
                  setBulkByOrderId((p) => ({ ...p, [order.id]: true }));

                  try {
                    // Si déjà chargé en cache, pas grave : on a besoin des lignes
                    const cached = await ensureDetails(order.id);
                    const baseLines = cached ?? (await refreshOrderFromServer(order.id));

                    const list = Array.isArray(baseLines) ? baseLines : [];

                    const tasks = list.map((l) => () => {
                      const max = Math.max(
                        0,
                        Math.trunc(asNumber(l.quantity_ready) - asNumber(l.quantity_shipped))
                      );
                      return patchOrderLineLoaded(order.id, l.id, max);
                    });

                    const { errors } = await runWithConcurrency(tasks, 5);

                    await refreshOrderFromServer(order.id);

                    if (errors.length) {
                      console.warn("Bulk loaded: erreurs partielles", errors);
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setBulkByOrderId((p) => ({ ...p, [order.id]: false }));
                  }
                }}
                markAllDisabled={!!bulkByOrderId[order.id]}
                statusKeyOverride={uiStatus}
                statusLabelOverride={uiLabel}
                stepperLabel="Chargés"
                markAllLabel="Tout charger"
                primaryLabel="Départ du camion"
                primaryDisabled={loadedTotal <= 0 || !!departByOrderId[order.id]}
                onPrimaryAction={async () => {
                  if (departByOrderId[order.id]) return;
                  setDepartByOrderId((p) => ({ ...p, [order.id]: true }));

                  try {
                    await postDepartTruck(order.id);
                    await refreshList();
                    setExpandedId(null);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setDepartByOrderId((p) => ({ ...p, [order.id]: false }));
                  }
                }}
                onFinishProduction={() => {}}
                onAddComment={() => {}}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Shipments;
