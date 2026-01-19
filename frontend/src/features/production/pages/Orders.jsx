/**
 * Production - Commandes à produire (mobile)
 * - Liste des commandes (cards) via API
 * - Accordéons (détails lazy au clic)
 * - Stepper "Prêts" branché sur PATCH ready
 * - Bouton "Production terminée" : valide manuellement (production_validated_at)
 *   pour sortir la commande de la liste "à produire" même si PROD_COMPLETE.
 * Note : commentaires pas branchés => on garde comments: []
 */
import { useEffect, useRef, useState, useCallback } from "react";
import ProductionOrderCard from "../components/ProductionOrderCard.jsx";
import {
  getProductionOrders,
  getOrderDetails,
  patchOrderLineReady,
  postProductionValidate,
} from "../../../services/orders.api.js";
import {
  mapProductionOrdersList,
  mapOrderDetailsToGroups,
} from "../mappers/productionOrders.mappers.js";
import {
  asNumber,
  statusFromProductionStatus,
} from "../utils/productionOrders.format.js";
import {
  buildMinByIdFromLines,
  injectMinMaxIntoGroups,
  runWithConcurrency,
} from "../utils/productionUi.utils.js";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [readyByLineId, setReadyByLineId] = useState({});

  const detailsLoadedRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bulkByOrderId, setBulkByOrderId] = useState({});

  const ordersRef = useRef([]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

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
    setReadyByLineId({});
  }

  function applyDetailsFromLines(orderId, lines) {
    const list = Array.isArray(lines) ? lines : [];
    const { groups, summary } = mapOrderDetailsToGroups(list);

    const minById = buildMinByIdFromLines(list);
    const groupsWithMin = injectMinMaxIntoGroups(groups, { minById });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, groups: groupsWithMin, summary } : o
      )
    );

    return { list, groupsWithMin, summary };
  }

  function syncReadyMapFromApiLines(lines) {
    const list = Array.isArray(lines) ? lines : [];
    setReadyByLineId((prev) => {
      const next = { ...prev };
      list.forEach((l) => {
        next[l.id] = asNumber(l.quantity_ready);
      });
      return next;
    });
  }

  const refreshList = useCallback(async ({ keepExpanded = false } = {}) => {
    setLoading(true);
    setError("");

    try {
      const res = await getProductionOrders();
      const mapped = mapProductionOrdersList(res?.data);

      setOrders(mapped);
      resetDetailsCache();

      if (!keepExpanded) setExpandedId(null);
    } catch {
      setError("Impossible de charger les commandes production.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  async function ensureDetails(orderId) {
    if (detailsLoadedRef.current.has(orderId)) return;
    detailsLoadedRef.current.add(orderId);

    try {
      const { lines } = await getOrderDetails(orderId);
      const { groupsWithMin } = applyDetailsFromLines(orderId, lines);

      // init des steppers depuis _readyFromApi (comme avant)
      setReadyByLineId((prev) => {
        const next = { ...prev };
        groupsWithMin.forEach((g) =>
          g.lines.forEach((l) => {
            if (next[l.id] === undefined) next[l.id] = asNumber(l._readyFromApi);
          })
        );
        return next;
      });
    } catch (e) {
      detailsLoadedRef.current.delete(orderId);
      console.error(e);
    }
  }

  return (
    <div className="p-4">
      <h1 className="gf-h1 text-center mb-1">Commandes à produire</h1>
      <p className="gf-body text-center text-gf-subtitle mb-3">
        Liste des commandes à préparer en production.
      </p>
      {loading ? (
        <div className="gf-empty">Chargement…</div>
      ) : error ? (
        <div className="gf-error">{error}</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <ProductionOrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onCountsChange={applyCounts}
              onToggle={() => {
                setExpandedId((cur) => {
                  const next = cur === order.id ? null : order.id;
                  if (next === order.id) ensureDetails(order.id);
                  return next;
                });
              }}
              readyByLineId={readyByLineId}
              onChangeReady={async (lineId, next) => {
                // optimistic
                setReadyByLineId((prev) => ({ ...prev, [lineId]: next }));

                try {
                  const res = await patchOrderLineReady(order.id, lineId, next);

                  const lines = Array.isArray(res?.lines) ? res.lines : [];
                  applyDetailsFromLines(order.id, lines);

                  // status depuis la réponse PATCH (comme avant)
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === order.id
                        ? {
                            ...o,
                            status: statusFromProductionStatus(
                              res?.productionStatus ?? res?.order?.production_status
                            ),
                          }
                        : o
                    )
                  );

                  // vérité BDD pour les steppers
                  syncReadyMapFromApiLines(lines);
                } catch {
                  detailsLoadedRef.current.delete(order.id);
                  await ensureDetails(order.id);
                }
              }}
              onMarkAllReady={async () => {
                // anti double-clic + disable
                if (bulkByOrderId[order.id]) return;
                setBulkByOrderId((p) => ({ ...p, [order.id]: true }));

                try {
                  await ensureDetails(order.id);

                  const current = ordersRef.current.find((o) => o.id === order.id);
                  if (!current || current.groups.length === 0) return;

                  const linesToUpdate = current.groups.flatMap((g) => g.lines);

                  // concurrency limitée (au lieu de for OU Promise.all)
                  const tasks = linesToUpdate.map((l) => () =>
                    patchOrderLineReady(order.id, l.id, l.total)
                  );

                  const { errors } = await runWithConcurrency(tasks, 5);

                  // vérité BDD : 1 seul fetch
                  const { order: freshOrder, lines: freshLines } = await getOrderDetails(order.id);
                  const lines = Array.isArray(freshLines) ? freshLines : [];

                  const { groups, summary } = mapOrderDetailsToGroups(lines);
                  const minById = buildMinByIdFromLines(lines);
                  const groupsWithMin = injectMinMaxIntoGroups(groups, { minById });

                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === order.id
                        ? {
                            ...o,
                            groups: groupsWithMin,
                            summary,
                            status: statusFromProductionStatus(freshOrder?.production_status),
                          }
                        : o
                    )
                  );

                  setReadyByLineId((prev) => {
                    const nextMap = { ...prev };
                    lines.forEach((l) => (nextMap[l.id] = asNumber(l.quantity_ready)));
                    return nextMap;
                  });

                  // signaler un échec partiel
                  if (errors.length) {
                    console.warn("Bulk ready: erreurs partielles", errors);
                  }

                  // IMPORTANT : on NE replie pas
                  // (donc pas de refreshList qui reset l'accordéon)
                  if (freshOrder?.production_status === "PROD_COMPLETE") {
                    await refreshList({ keepExpanded: true });
                    setExpandedId(order.id);
                    await ensureDetails(order.id);
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setBulkByOrderId((p) => ({ ...p, [order.id]: false }));
                }
              }}
              markAllDisabled={!!bulkByOrderId[order.id]}

              primaryLabel="Production terminée"
              onPrimaryAction={async () => {
                await postProductionValidate(order.id);
                await refreshList();
                setExpandedId(null);
              }}            
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
