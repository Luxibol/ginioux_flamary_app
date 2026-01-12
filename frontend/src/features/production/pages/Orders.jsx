/**
 * Production - Commandes à produire (mobile)
 * - Liste des commandes (cards) via API
 * - Accordéons (détails lazy au clic)
 * - Stepper "Prêts" branché sur PATCH ready
 * - Bouton "Production terminée" : valide manuellement (production_validated_at)
 *   pour sortir la commande de la liste "à produire" même si PROD_COMPLETE.
 * Note : commentaires pas branchés => on garde comments: []
 */
import { useEffect, useState, useRef } from "react";
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
import { asNumber, statusFromProductionStatus } from "../utils/productionOrders.format.js";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [readyByLineId, setReadyByLineId] = useState({});

  const detailsLoadedRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshList() {
    setLoading(true);
    setError("");

    try {
      const res = await getProductionOrders();

      const mapped = mapProductionOrdersList(res?.data);

      setOrders(mapped);
      detailsLoadedRef.current = new Set();
      setReadyByLineId({});

      setExpandedId(null);

    } catch (e) {
      setError("Impossible de charger les commandes production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureDetails(orderId) {
    if (detailsLoadedRef.current.has(orderId)) return;
    detailsLoadedRef.current.add(orderId);

    try {
      const { lines } = await getOrderDetails(orderId);
      const list = Array.isArray(lines) ? lines : [];

      const { groups, summary } = mapOrderDetailsToGroups(list);

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, groups, summary } : o))
      );

      setReadyByLineId((prev) => {
        const next = { ...prev };
        groups.forEach((g) =>
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
      <h1 className="text-center text-sm font-semibold text-gf-text mb-3">
        Commandes à produire
      </h1>

      {loading ? (
        <div className="text-sm text-gf-muted">Chargement…</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <ProductionOrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => {
                setExpandedId((cur) => {
                  const next = cur === order.id ? null : order.id;
                  if (next === order.id) ensureDetails(order.id);
                  return next;
                });
              }}
              readyByLineId={readyByLineId}
              onChangeReady={async (lineId, next) => {
                setReadyByLineId((prev) => ({ ...prev, [lineId]: next }));

                try {
                  const res = await patchOrderLineReady(order.id, lineId, next);

                  const lines = Array.isArray(res?.lines) ? res.lines : [];
                  const { groups, summary } = mapOrderDetailsToGroups(lines);

                  setOrders((prev) =>
                    prev.map((o) => {
                      if (o.id !== order.id) return o;
                      return {
                        ...o,
                        groups,
                        summary,
                        status: statusFromProductionStatus(
                          res?.productionStatus ?? res?.order?.production_status
                        ),
                      };
                    })
                  );

                  setReadyByLineId((prev) => {
                    const nextMap = { ...prev };
                    lines.forEach((l) => {
                      nextMap[l.id] = asNumber(l.quantity_ready);
                    });
                    return nextMap;
                  });

                } catch (e) {
                  detailsLoadedRef.current.delete(order.id);
                  await ensureDetails(order.id);
                }
              }}
              onMarkAllReady={async () => {
                await ensureDetails(order.id);

                const current = orders.find((o) => o.id === order.id);
                if (!current || current.groups.length === 0) return;

                try {
                  const tasks = current.groups.flatMap((g) =>
                    g.lines.map((l) => patchOrderLineReady(order.id, l.id, l.total))
                  );
                  await Promise.all(tasks);

                  // vérité BDD : 1 seul fetch
                  const { order: freshOrder, lines: freshLines } = await getOrderDetails(order.id);
                  const lines = Array.isArray(freshLines) ? freshLines : [];

                  const { groups, summary } = mapOrderDetailsToGroups(lines);

                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === order.id
                        ? {
                            ...o,
                            groups,
                            summary,
                            status: statusFromProductionStatus(freshOrder?.production_status),
                          }
                        : o
                    )
                  );

                  setReadyByLineId((prev) => {
                    const nextMap = { ...prev };
                    lines.forEach((l) => {
                      nextMap[l.id] = asNumber(l.quantity_ready);
                    });
                    return nextMap;
                  });

                  if (freshOrder?.production_status === "PROD_COMPLETE") {
                    await refreshList();
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
              onFinishProduction={async () => {
                await postProductionValidate(order.id);
                await refreshList();
                setExpandedId(null);
              }}
              onAddComment={() => {
                alert("À faire : modal nouveau commentaire");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
