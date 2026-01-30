/**
 * @file frontend/src/features/production/pages/Shipments.jsx
 * @description Page Production (mobile) : expéditions à charger, détails lazy, MAJ "chargés", bulk et départ camion.
 */

import { useEffect, useRef, useState } from "react";
import ProductionOrderCard from "../components/ProductionOrderCard.jsx";
import { useProductionEvents } from "../hooks/useProductionEvents.js";
import {
  getProductionShipments,
  getOrderDetails,
  patchOrderLineLoaded,
  postDepartTruck,
  getOrderCommentCounts,
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

/**
 * Page Production : expéditions à charger (loaded), bulk et départ camion.
 * @returns {import("react").JSX.Element}
 */
function Shipments() {
  const PATCH_DEBOUNCE_MS = 350;

  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [loadedByLineId, setLoadedByLineId] = useState({});
  const detailsLoadedRef = useRef(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bulkByOrderId, setBulkByOrderId] = useState({});
  const [departByOrderId, setDepartByOrderId] = useState({});

  const [commentsOpenByOrderId, setCommentsOpenByOrderId] = useState({});

  // PATCH : debouncé par ligne + anti double-envoi.
  const patchTimersRef = useRef(new Map());
  const patchLastValueRef = useRef(new Map());
  const patchInFlightRef = useRef(new Set());

  // Anti-rebond SSE : ignore temporairement les events après action locale.
  const muteSseUntilRef = useRef(new Map());
  function muteSse(orderId, ms = 1500) {
    muteSseUntilRef.current.set(orderId, Date.now() + ms);
  }
  function isMuted(orderId) {
    return (muteSseUntilRef.current.get(orderId) || 0) > Date.now();
  }

  // Empêche les refresh auto pendant une interaction utilisateur (saisie/focus) pour préserver l'UX.
  const busyUntilRef = useRef(0);
  function isUserEditing() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }
  function markBusy(ms = 5000) {
    busyUntilRef.current = Math.max(busyUntilRef.current, Date.now() + ms);
  }
  function isBusy() {
    return Date.now() < busyUntilRef.current || isUserEditing();
  }

  // Retry différé quand l'utilisateur est occupé.
  const retryTimerRef = useRef(null);

  // SSE : regroupe les events et rafraîchit sans perturber l'accordéon/saisie.
  const [commentsRefreshTick, setCommentsRefreshTick] = useState({});
  const pendingOrderIdsRef = useRef(new Set());
  const flushTimerRef = useRef(null);

  const expandedIdRef = useRef(null);
  useEffect(() => {
    expandedIdRef.current = expandedId;
  }, [expandedId]);

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  /**
   * Applique les compteurs messages/non-lus à une commande.
   * Conserve les badges commentaires au niveau de la liste.
   * @param {number} orderId
   * @param {{ messagesCount?: number, unreadCount?: number }} counts
   * @returns {void}
   */
  const applyCounts = (orderId, counts) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              messagesCount: Number(counts?.messagesCount ?? 0),
              unreadCount: Number(counts?.unreadCount ?? 0),
            }
          : o,
      ),
    );
  };

  const countsTimersRef = useRef({});

  function queueCountsRefresh(orderId) {
    if (!orderId) return;

    // Debounce par commande : évite des rafales réseau en cas de burst d'events.
    if (countsTimersRef.current[orderId]) return;

    countsTimersRef.current[orderId] = setTimeout(async () => {
      countsTimersRef.current[orderId] = null;
      try {
        const counts = await getOrderCommentCounts(orderId);
        applyCounts(orderId, counts);
      } catch {
        // silent
      }
    }, 250);
  }

  /**
   * Réinitialise le cache des détails et les steppers.
   * @returns {void}
   */
  function resetDetailsCache() {
    detailsLoadedRef.current = new Set();
    setLoadedByLineId({});
  }

  /**
  * Calcule et injecte dans l'UI les groupes (max chargeable), la map loaded et le résumé de chargement.
   * @param {number} orderId
   * @param {any[]} lines
   * @returns {{ list: any[], groupsWithMax: any[], totals: any }}
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
          : o,
      ),
    );

    return { list, groupsWithMax, totals: t };
  }

  /**
   * Recharge la liste des expéditions à charger.
   * @returns {Promise<void>}
   */
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

  async function refreshListSilent() {
    try {
      const res = await getProductionShipments();
      const data = Array.isArray(res?.data) ? res.data : [];

      const fresh = data.map((o) => {
        const loadedTotal = Number(o.loaded_total ?? 0);
        const chargeableTotal = Number(o.chargeable_total ?? 0);

        return {
          id: o.id,
          company: o.client_name ?? "—",
          arc: o.arc ?? "—",
          pickupDate: formatDateFR(o.pickup_date),
          priority: o.priority ?? "NORMAL",
          priorityLabel: priorityLabel(o.priority),

          loadedTotal,
          chargeableTotal,

          messagesCount: Number(o.messagesCount ?? 0),
          unreadCount: Number(o.unreadCount ?? 0),

          groups: [],
          comments: [],
          summary: `Chargés ${loadedTotal}/${chargeableTotal}`,
        };
      });

      setOrders((prev) => {
        const prevById = new Map(prev.map((o) => [o.id, o]));
        return fresh.map((f) => {
          const cur = prevById.get(f.id);
          if (!cur) return f;

          return {
            ...cur,
            ...f,
            // garde les détails si déjà chargés
            groups: cur.groups?.length ? cur.groups : f.groups,
            summary: cur.groups?.length ? cur.summary : f.summary,
          };
        });
      });

      // si commande ouverte disparue => on ferme
      const openId = expandedIdRef.current;
      if (openId && !fresh.some((o) => o.id === openId)) {
        setExpandedId(null);
      }
    } catch {
      // silent
    }
  }

  async function refreshExpandedDetails(orderId) {
    try {
      const { lines } = await getOrderDetails(orderId);
      applyOrderUiFromLines(orderId, lines);
    } catch {
      // silent
    }
  }

  function requestRefresh(orderId, { comments = false, skipList = false } = {}) {
    if (!orderId) return;

    pendingOrderIdsRef.current.add(orderId);

    if (comments) {
      setCommentsRefreshTick((p) => ({
        ...p,
        [orderId]: (p[orderId] || 0) + 1,
      }));
    }

    if (flushTimerRef.current) return;

    flushTimerRef.current = setTimeout(async () => {
      flushTimerRef.current = null;

      const busy = isBusy();
      const ids = Array.from(pendingOrderIdsRef.current);
      pendingOrderIdsRef.current.clear();

      // 1) Liste uniquement si pas busy
      if (!skipList && !busy) {
        await refreshListSilent();
      }

      // 2) Détails uniquement si pas busy
      const openId = expandedIdRef.current;
      if (!busy && openId && ids.includes(openId)) {
        await refreshExpandedDetails(openId);
        return;
      }

      // 3) Si busy -> retry détails plus tard (SANS relancer la liste)
      if (busy && openId && ids.includes(openId)) {
        pendingOrderIdsRef.current.add(openId);

        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          requestRefresh(openId, { comments: false, skipList: true });
        }, 800);
      }
    }, 120);
  }


  /**
   * Charge les détails 1 seule fois par orderId (lazy).
   * @param {number} orderId
   * @returns {Promise<any[]|null>}
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

  /**
   * Relit la vérité BDD pour un orderId et resynchronise l'UI.
   * @param {number} orderId
   * @returns {Promise<any[]>}
   */
  async function refreshOrderFromServer(orderId) {
    const fresh = await getOrderDetails(orderId);
    const freshLines = Array.isArray(fresh?.lines) ? fresh.lines : [];
    applyOrderUiFromLines(orderId, freshLines);
    return freshLines;
  }

  useProductionEvents((evt) => {
    const orderId = Number(evt?.orderId || 0);
    if (!orderId) return;

    const exists = ordersRef.current.some((o) => o.id === orderId);
    if (!exists) return;

    const isCommentEvt =
      evt?.type === "order_comment_created" || evt?.type === "order_comment_reads";

    // si event data et on vient de faire une action locale => ignore
    if (!isCommentEvt && isMuted(orderId)) return;

    // Badge enveloppe : endpoint léger
    if (isCommentEvt) queueCountsRefresh(orderId);

    requestRefresh(orderId, {
      comments: evt?.type === "order_comment_created",
      skipList: isCommentEvt,
    });
  });

  useEffect(() => {
    // Capture des refs une seule fois : nettoyage fiable au unmount sans dépendances.
    const patchTimers = patchTimersRef.current;
    const patchLastValue = patchLastValueRef.current;
    const patchInFlight = patchInFlightRef.current;
    const muteSseUntil = muteSseUntilRef.current;

    return () => {
      // 1) flush timer (SSE batch)
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      // 2) retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // 3) timers counts (debounce par commande)
      const timers = countsTimersRef.current || {};
      Object.values(timers).forEach((t) => t && clearTimeout(t));
      countsTimersRef.current = {};

      // 4) patch debounce timers
      for (const t of patchTimers.values()) {
        if (t) clearTimeout(t);
      }

      // 5) clear maps/sets (via variables capturées)
      patchTimers.clear();
      patchLastValue.clear();
      patchInFlight.clear();
      muteSseUntil.clear();
    };
  }, []);

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
                commentsRefreshSignal={commentsRefreshTick[order.id] || 0}
                onToggle={() => {
                  setExpandedId((cur) => {
                    const next = cur === order.id ? null : order.id;

                    // si on ferme -> on ferme aussi commentaires
                    if (next === null) {
                      setCommentsOpenByOrderId((m) => ({
                        ...m,
                        [order.id]: false,
                      }));
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
                  setCommentsOpenByOrderId((m) => ({
                    ...m,
                    [order.id]: Boolean(open),
                  }))
                }
                onCountsChange={applyCounts}
                onChangeReady={(lineId, next) => {
                  markBusy(3000);

                  // MAJ optimiste + PATCH debouncé par ligne (évite rafales réseau).
                  setLoadedByLineId((prev) => ({ ...prev, [lineId]: next }));

                  const timers = patchTimersRef.current;
                  const last = patchLastValueRef.current;

                  const key = `${order.id}:${lineId}`;
                  last.set(key, next);

                  if (timers.has(key)) clearTimeout(timers.get(key));

                  timers.set(
                    key,
                    setTimeout(async () => {
                      timers.delete(key);

                      const value = last.get(key);

                      // Ignore temporairement les events SSE consécutifs au PATCH (évite re-fetch immédiat).
                      muteSse(order.id, 2500);

                      if (patchInFlightRef.current.has(key)) return;
                      patchInFlightRef.current.add(key);

                      try {
                        const res = await patchOrderLineLoaded(order.id, lineId, value);
                        const apiLines = Array.isArray(res?.lines) ? res.lines : [];
                        applyOrderUiFromLines(order.id, apiLines);
                      } catch {
                        await refreshOrderFromServer(order.id);
                      } finally {
                        patchInFlightRef.current.delete(key);
                        markBusy(1500);
                      }
                    }, PATCH_DEBOUNCE_MS),
                  );
                }}
                onMarkAllReady={async () => {
                  if (bulkByOrderId[order.id]) return;
                  setBulkByOrderId((p) => ({ ...p, [order.id]: true }));

                  markBusy(12000);
                  muteSse(order.id, 5000);

                  try {
                    const cached = await ensureDetails(order.id);
                    const baseLines =
                      cached ?? (await refreshOrderFromServer(order.id));

                    const list = Array.isArray(baseLines) ? baseLines : [];

                    const tasks = list.map((l) => () => {
                      const max = Math.max(
                        0,
                        Math.trunc(
                          asNumber(l.quantity_ready) -
                            asNumber(l.quantity_shipped),
                        ),
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
                primaryDisabled={
                  loadedTotal <= 0 || !!departByOrderId[order.id]
                }
                onPrimaryAction={async () => {
                  if (departByOrderId[order.id]) return;
                  setDepartByOrderId((p) => ({ ...p, [order.id]: true }));

                  try {
                    markBusy(8000);
                    muteSse(order.id, 4000);

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
