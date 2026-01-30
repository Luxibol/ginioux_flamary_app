/**
 * Production - Commandes à produire (mobile)
 * - Liste des commandes (cards) via API
 * - Accordéons (détails lazy au clic)
 * - Stepper "Prêts" branché sur PATCH ready
 * - Bouton "Production terminée" : valide manuellement (production_validated_at)
 *   pour sortir la commande de la liste "à produire" même si PROD_COMPLETE.
 *   Note : commentaires non branchés (comments: []).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import ProductionOrderCard from "../components/ProductionOrderCard.jsx";
import { useProductionEvents } from "../hooks/useProductionEvents.js";
import {
  getProductionOrders,
  getOrderDetails,
  patchOrderLineReady,
  postProductionValidate,
  getOrderCommentCounts,
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

/**
 * Orders Production (page).
 * - Liste + accordéon (détails lazy)
 * - MAJ "prêts" (PATCH) + validation production
 * @returns {import("react").JSX.Element}
 */
function Orders() {
  const PATCH_DEBOUNCE_MS = 350;

  const patchTimersRef = useRef(new Map());
  const patchLastValueRef = useRef(new Map());

  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [readyByLineId, setReadyByLineId] = useState({});

  const detailsLoadedRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bulkByOrderId, setBulkByOrderId] = useState({});

  // --- SSE: refresh 1-shot + refresh commentaires (sans casser la saisie) ---
  const [commentsRefreshTick, setCommentsRefreshTick] = useState({});
  const pendingOrderIdsRef = useRef(new Set());
  const flushTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  const patchInFlightRef = useRef(new Set());

  // --- Anti refresh SSE après actions locales (évite GET /orders/production + GET /orders/:id) ---
  const muteSseUntilRef = useRef(new Map());

  function muteSse(orderId, ms = 1500) {
    muteSseUntilRef.current.set(orderId, Date.now() + ms);
  }

  function isMuted(orderId) {
    return (muteSseUntilRef.current.get(orderId) || 0) > Date.now();
  }

  const expandedIdRef = useRef(null);
  useEffect(() => {
    expandedIdRef.current = expandedId;
  }, [expandedId]);

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
  

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const countsTimersRef = useRef({});
  function queueCountsRefresh(orderId) {
    if (!orderId) return;

    // debounce par commande (1 seule requête même si 10 events arrivent)
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
   * Applique les compteurs messages/non-lus à une commande.
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

  /**
   * Réinitialise le cache des détails et les steppers.
   * @returns {void}
   */
  function resetDetailsCache() {
    detailsLoadedRef.current = new Set();
    setReadyByLineId({});
  }

  /**
   * Injecte les détails (groupes + summary) dans une commande.
   * @param {number} orderId
   * @param {any[]} lines
   * @returns {{ list: any[], groupsWithMin: any[], summary: any }}
   */
  function applyDetailsFromLines(orderId, lines) {
    const list = Array.isArray(lines) ? lines : [];
    const { groups, summary } = mapOrderDetailsToGroups(list);

    const minById = buildMinByIdFromLines(list);
    const groupsWithMin = injectMinMaxIntoGroups(groups, { minById });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, groups: groupsWithMin, summary } : o,
      ),
    );

    return { list, groupsWithMin, summary };
  }

  /**
   * Synchronise la map des "prêts" depuis les lignes API.
   * @param {any[]} lines
   * @returns {void}
   */
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

  /**
   * Recharge la liste des commandes production.
   * @param {{ keepExpanded?: boolean }} [options]
   * @returns {Promise<void>}
   */
    const refreshList = useCallback(async ({ keepExpanded = false } = {}) => {
    setLoading(true);
    setError("");

    try {
      const res = await getProductionOrders();
      const fresh = mapProductionOrdersList(res?.data);

      setOrders((prev) => {
        const prevById = new Map(prev.map((o) => [o.id, o]));

        return fresh.map((f) => {
          const cur = prevById.get(f.id);
          if (!cur) return f;

          // si on garde l'accordéon, on conserve les détails déjà chargés
          if (keepExpanded) {
            return {
              ...cur, // garde groups/summary + tout ce qui n'est pas dans f
              ...f,   // met à jour les champs "vivants" de la liste
              groups: cur.groups ?? f.groups,
              summary: cur.summary ?? f.summary,
            };
          }

          return f;
        });
      });

      // reset uniquement si on ne garde pas l'accordéon
      if (!keepExpanded) {
        resetDetailsCache();
        setExpandedId(null);
      }
    } catch {
      setError("Impossible de charger les commandes production.");
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const refreshListSilent = useCallback(async () => {
    try {
      const res = await getProductionOrders();
      const fresh = mapProductionOrdersList(res?.data);

      setOrders((prev) => {
      const prevById = new Map(prev.map((o) => [o.id, o]));
      return fresh.map((f) => {
        const cur = prevById.get(f.id);
        if (!cur) return f;

        return {
          ...cur,
          ...f,
          groups: cur.groups,
          summary: cur.summary,
        };
      });
    });

      // si commande ouverte disparue (validée), on ferme proprement
      const openId = expandedIdRef.current;
      if (openId && !fresh.some((o) => o.id === openId)) {
        setExpandedId(null);
      }
    } catch {
      // silent
    }
  }, []);

  const refreshExpandedDetails = useCallback(async (orderId) => {
    try {
      const { lines } = await getOrderDetails(orderId);
      applyDetailsFromLines(orderId, lines);
      syncReadyMapFromApiLines(Array.isArray(lines) ? lines : []);
    } catch {
      // silent
    }
  }, []);

  function requestRefresh(orderId, { comments = false, skipList = false } = {}) {
    if (!orderId) return;

    pendingOrderIdsRef.current.add(orderId);

    // Si l'event concerne les commentaires: on déclenche 1 reload du thread
    if (comments) {
      setCommentsRefreshTick((p) => ({
        ...p,
        [orderId]: (p[orderId] || 0) + 1,
      }));
    }

    // Déjà un flush programmé ? On ne reprogramme pas.
    if (flushTimerRef.current) return;

    flushTimerRef.current = setTimeout(async () => {
      flushTimerRef.current = null;

      const busy = isBusy();

      const ids = Array.from(pendingOrderIdsRef.current);
      pendingOrderIdsRef.current.clear();

      // 1) On refresh la liste uniquement si PAS busy
      if (!skipList && !busy) {
        await refreshListSilent();
      }

      // 2) Détails : uniquement si pas busy (évite d'écraser une saisie)
      const openId = expandedIdRef.current;
      if (!busy && openId && ids.includes(openId)) {
        await refreshExpandedDetails(openId);
        return;
      }

      // 3) Si busy et la commande ouverte est concernée : retry plus tard
      if (busy && openId && ids.includes(openId)) {
        pendingOrderIdsRef.current.add(openId);

        // IMPORTANT : on ne réutilise pas flushTimerRef ici, sinon on bloque
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          requestRefresh(openId, { comments: false });
        }, 800);
      }
    }, 120);
  }

  useProductionEvents((evt) => {
    const orderId = Number(evt?.orderId || 0);
    if (!orderId) return;

    const exists = ordersRef.current.some((o) => o.id === orderId);
    if (!exists) return;

    const isCommentEvt =
      evt?.type === "order_comment_created" ||
      evt?.type === "order_comment_reads";

    // si c'est un event "data" (pas commentaire) et qu'on vient de patch local => on ignore
    if (!isCommentEvt && isMuted(orderId)) return;

    // 1) Pour les commentaires : MAJ badge via endpoint léger (pas de refresh list)
    if (isCommentEvt) {
      queueCountsRefresh(orderId);
    }

    // 2) Thread commentaires : refresh uniquement si "created"
    requestRefresh(orderId, {
      comments: evt?.type === "order_comment_created",
      skipList: isCommentEvt,
    });
  });


  /**
   * Assure le chargement des détails d'une commande (1 seule fois).
   * @param {number} orderId
   * @returns {Promise<void>}
   */
  async function ensureDetails(orderId) {
    if (detailsLoadedRef.current.has(orderId)) return;
    detailsLoadedRef.current.add(orderId);

    try {
      const { lines } = await getOrderDetails(orderId);
      const { groupsWithMin } = applyDetailsFromLines(orderId, lines);

      setReadyByLineId((prev) => {
        const next = { ...prev };
        groupsWithMin.forEach((g) =>
          g.lines.forEach((l) => {
            if (next[l.id] === undefined)
              next[l.id] = asNumber(l._readyFromApi);
          }),
        );
        return next;
      });
    } catch (e) {
      detailsLoadedRef.current.delete(orderId);
      console.error(e);
    }
  }

  useEffect(() => {
    //  capture une fois (pour éviter warnings react-hooks/exhaustive-deps)
    const patchTimers = patchTimersRef.current;
    const patchLastValue = patchLastValueRef.current;
    const patchInFlight = patchInFlightRef.current;
    const muteSseUntil = muteSseUntilRef.current;

    return () => {
      // --- SSE batch / retry ---
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // --- timers counts (debounce par commande) ---
      const countsTimers = countsTimersRef.current || {};
      Object.values(countsTimers).forEach((t) => t && clearTimeout(t));
      countsTimersRef.current = {};

      // --- patch debounce timers ---
      for (const t of patchTimers.values()) {
        if (t) clearTimeout(t);
      }

      // --- clear maps/sets ---
      patchTimers.clear();
      patchLastValue.clear();
      patchInFlight.clear();
      muteSseUntil.clear();
    };
  }, []);

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
              commentsRefreshSignal={commentsRefreshTick[order.id] || 0}
              onToggle={() => {
                setExpandedId((cur) => {
                  const next = cur === order.id ? null : order.id;
                  if (next === order.id) ensureDetails(order.id);
                  return next;
                });
              }}
              readyByLineId={readyByLineId}
              onChangeReady={(lineId, next) => {
                markBusy(3000);

                // optimistic direct
                setReadyByLineId((prev) => ({ ...prev, [lineId]: next }));

                // debounce PATCH par ligne
                const timers = patchTimersRef.current;
                const last = patchLastValueRef.current;

                //  clé unique par commande + ligne
                const key = `${order.id}:${lineId}`;

                //  on stocke la dernière valeur avec la MÊME clé
                last.set(key, next);

                // debounce avec la MÊME clé
                if (timers.has(key)) clearTimeout(timers.get(key));

                timers.set(
                  key,
                  setTimeout(async () => {
                    timers.delete(key);

                    const value = last.get(key);

                    // on mute les SSE après action locale
                    muteSse(order.id, 4000);

                    // anti double PATCH en même temps
                    if (patchInFlightRef.current.has(key)) return;
                    patchInFlightRef.current.add(key);

                    try {
                      const res = await patchOrderLineReady(order.id, lineId, value);
                      const lines = Array.isArray(res?.lines) ? res.lines : [];
                      applyDetailsFromLines(order.id, lines);

                      setOrders((prev) =>
                        prev.map((o) =>
                          o.id === order.id
                            ? {
                                ...o,
                                status: statusFromProductionStatus(
                                  res?.productionStatus ?? res?.order?.production_status,
                                ),
                              }
                            : o,
                        ),
                      );

                      syncReadyMapFromApiLines(lines);
                    } catch (e) {
                      if (e?.status === 429) return;
                      detailsLoadedRef.current.delete(order.id);
                      await ensureDetails(order.id);
                    } finally {
                      patchInFlightRef.current.delete(key);
                      markBusy(1500);
                    }
                  }, PATCH_DEBOUNCE_MS),
                );
              }}
              onMarkAllReady={async () => {
                // anti double-clic + disable
                if (bulkByOrderId[order.id]) return;
                setBulkByOrderId((p) => ({ ...p, [order.id]: true }));

                try {
                  markBusy(12000);
                  muteSse(order.id, 5000);
                  await ensureDetails(order.id);

                  const current = ordersRef.current.find(
                    (o) => o.id === order.id,
                  );
                  if (!current || current.groups.length === 0) return;

                  const linesToUpdate = current.groups.flatMap((g) => g.lines);

                  const tasks = linesToUpdate.map(
                    (l) => () => patchOrderLineReady(order.id, l.id, l.total),
                  );

                  const { errors } = await runWithConcurrency(tasks, 5);

                  // vérité BDD : 1 seul fetch
                  const { order: freshOrder, lines: freshLines } =
                    await getOrderDetails(order.id);
                  const lines = Array.isArray(freshLines) ? freshLines : [];

                  const { groups, summary } = mapOrderDetailsToGroups(lines);
                  const minById = buildMinByIdFromLines(lines);
                  const groupsWithMin = injectMinMaxIntoGroups(groups, {
                    minById,
                  });

                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === order.id
                        ? {
                            ...o,
                            groups: groupsWithMin,
                            summary,
                            status: statusFromProductionStatus(
                              freshOrder?.production_status,
                            ),
                          }
                        : o,
                    ),
                  );

                  setReadyByLineId((prev) => {
                    const nextMap = { ...prev };
                    lines.forEach(
                      (l) => (nextMap[l.id] = asNumber(l.quantity_ready)),
                    );
                    return nextMap;
                  });

                  if (errors.length) {
                    console.warn("Bulk ready: erreurs partielles", errors);
                  }

                  // keep expanded
                  if (freshOrder?.production_status === "PROD_COMPLETE") {
                    await refreshList({ keepExpanded: true });
                    setExpandedId(order.id);
                    await refreshExpandedDetails(order.id); // <-- force la vérité BDD sans dépendre du cache
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  markBusy(1500);
                  setBulkByOrderId((p) => ({ ...p, [order.id]: false }));
                }
              }}
              markAllDisabled={!!bulkByOrderId[order.id]}
              primaryLabel="Production terminée"
              onPrimaryAction={async () => {
                markBusy(8000);
                muteSse(order.id, 4000);
                try {
                  await postProductionValidate(order.id);
                  await refreshList();
                  setExpandedId(null);
                } finally {
                  markBusy(1500);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
