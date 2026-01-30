/**
 * @file frontend/src/features/admin/pages/Dashboard.jsx
 * @description Dashboard Admin : KPIs (production/expéditions), urgences, activité récente, mini-stats par période.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { usePullToRefreshMobile } from "../../../utils/pullToRefreshMobile.hook.js";

import {
  getActiveOrders,
  getProductionOrders,
  getProducedOrdersCount,
  getOrderDetails,
} from "../../../services/orders.api.js";
import { getArchivedOrders } from "../../../services/history.api.js";

import KpiCard from "../components/KpiCard.jsx";
import MiniStat from "../components/MiniStat.jsx";
import UrgentTable from "../components/UrgentTable.jsx";
import ActivityList from "../components/ActivityList.jsx";
import { sameDay } from "../utils/dashboard.format.js";
import { getUser } from "../../../services/auth.storage.js";

/**
 * Détermine la famille produit à partir d'une ligne (category en priorité).
 * @param {object} line Ligne de commande
 * @returns {"BIGBAG"|"ROCHE"|"OTHER"}
 */
function normalizeFamily(line) {

  const cat = String(line?.category ?? "")
    .toUpperCase()
    .trim();

  if (cat === "ROCHE") return "ROCHE";

  if (cat === "BIGBAG") return "BIGBAG";

  const label = String(line?.label ?? "").toLowerCase();
  if (label.includes("roche")) return "ROCHE";
  if (label.includes("big") || label.includes("bag")) return "BIGBAG";

  return "OTHER";
}

/**
 * Calcule les totaux BigBag/Roche à partir d'une liste d'IDs commandes.
 * Détaille un nombre limité de commandes pour éviter un coût réseau trop élevé.
 * @param {Array<number|string>} orderIds Identifiants de commandes
 * @param {object} [options]
 * @param {number} [options.limit=30] Limite du nombre de commandes détaillées (perf)
 * @param {"ORDERED"|"SHIPPED"|"READY"|"DISPATCH"} [options.mode="ORDERED"] Mode de calcul
 * @returns {Promise<{bigbag:number, roche:number}>}
 */
async function computeTotalsFromOrders(
  orderIds,
  { limit = 30, mode = "ORDERED" } = {},
) {
  const ids = Array.isArray(orderIds) ? orderIds.slice(0, limit) : [];
  let bigbag = 0;
  let roche = 0;

  for (const id of ids) {
    try {
      const details = await getOrderDetails(id);
      const lines = Array.isArray(details?.lines) ? details.lines : [];

      for (const l of lines) {
        const fam = normalizeFamily(l);

        const shipped = Number(l.quantity_shipped ?? 0);
        const ready = Number(l.quantity_ready ?? 0);

        const raw =
          mode === "SHIPPED"
            ? shipped
            : mode === "READY"
              ? Math.max(ready - shipped, 0) // Reste prêt (hors expédié)
              : mode === "DISPATCH"
                ? shipped + Math.max(ready - shipped, 0) // Expédié + reste prêt
                : Number(l.quantity_ordered ?? 0);

        const qty = Number(raw);
        if (!Number.isFinite(qty)) continue;

        if (fam === "BIGBAG") bigbag += qty;
        if (fam === "ROCHE") roche += qty;
      }
    } catch {
      // ignore
    }
  }

  return { bigbag, roche };
}

const PERIODS = [
  { value: "7D", label: "7 jours" },
  { value: "30D", label: "30 jours" },
  { value: "90D", label: "90 jours" },
  { value: "ALL", label: "Tout" },
];

export default function Dashboard() {

  const { registerRefresh } = usePullToRefreshMobile();

  const [, setRefreshing] = useState(false); // État silencieux utilisé par le pull-to-refresh (sans spinner visible).

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const navigate = useNavigate();
  const firstName = useMemo(() => {
    const user = getUser();
    return user?.first_name || "Administrateur";
  }, []);

  const [producedTotals, setProducedTotals] = useState({ bigbag: 0, roche: 0 });

  // La période pilote uniquement les mini-stats (bloc bas).
  const [periodBottom, setPeriodBottom] = useState("7D");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Haut de page (stable)
  const [urgentRows, setUrgentRows] = useState([]);
  const [produceCount, setProduceCount] = useState(0);
  const [produceUrgentCount, setProduceUrgentCount] = useState(0);
  const [todayArchivedCount, setTodayArchivedCount] = useState(0);

  // Pour l'activité récente (archived 7D stable)
  const [archived7dRows, setArchived7dRows] = useState([]);

  // Bas de page (piloté par select)
  const [bottomArchivedCount, setBottomArchivedCount] = useState(0);
  const [producedCount, setProducedCount] = useState(0);

  // Totaux BigBag/Roche (maquette)
  const [topProduceTotals, setTopProduceTotals] = useState({
    bigbag: 0,
    roche: 0,
  });
  const [topTodayShipTotals, setTopTodayShipTotals] = useState({
    bigbag: 0,
    roche: 0,
  });
  const [bottomShipTotals, setBottomShipTotals] = useState({
    bigbag: 0,
    roche: 0,
  });

  const activities = useMemo(() => {
    const items = [];

    for (const o of urgentRows.slice(0, 2)) {
      items.push(`Urgent — ${o.arc} (${o.client_name ?? "—"})`);
    }

    const firstArchived = archived7dRows[0];
    if (firstArchived) {
      items.push(
        `Expédiée — ${firstArchived.arc} (${firstArchived.client_name ?? "—"})`,
      );
    }

    return items;
  }, [urgentRows, archived7dRows]);

/**
 * Charge les données du haut de page (KPIs + urgences + activité récente).
 */
  const runTop = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [prodRes, urgentRes, archived7dRes] = await Promise.all([
        getProductionOrders({ limit: 200, offset: 0 }),
        getActiveOrders({ priority: "URGENT" }),
        getArchivedOrders({ period: "7D" }),
      ]);

      if (!aliveRef.current) return;

      const prodList = Array.isArray(prodRes?.data) ? prodRes.data : [];
      setProduceCount(prodList.length);
      setProduceUrgentCount(prodList.filter((o) => o.priority === "URGENT").length);

      (async () => {
        const ids = prodList.map((o) => o.id).filter(Boolean);
        const totals = await computeTotalsFromOrders(ids, { limit: 30, mode: "ORDERED" });
        if (aliveRef.current) setTopProduceTotals(totals);
      })();

      const urgList = Array.isArray(urgentRes?.data) ? urgentRes.data : [];
      setUrgentRows(urgList.slice(0, 3));

      const arch7 = Array.isArray(archived7dRes?.data) ? archived7dRes.data : [];
      setArchived7dRows(arch7);

      const today = new Date();
      const todayOrders = arch7.filter((o) => sameDay(o.last_departed_at, today));
      setTodayArchivedCount(todayOrders.length);

      (async () => {
        const ids = todayOrders.map((o) => o.id).filter(Boolean);
        const totals = await computeTotalsFromOrders(ids, { limit: 30, mode: "SHIPPED" });
        if (aliveRef.current) setTopTodayShipTotals(totals);
      })();
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e?.message || "Erreur lors du chargement du dashboard admin.");
    } finally {
      if (aliveRef.current) {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
  runTop({ silent: false });
}, [runTop]);

/**
 * Charge les mini-stats dépendantes de la période (expéditions + produits).
 */
  const runBottom = useCallback(async () => {
    try {
      const [archivedRes, producedRes] = await Promise.all([
        getArchivedOrders({ period: periodBottom }),
        getProducedOrdersCount({ period: periodBottom }),
      ]);

      if (!aliveRef.current) return;

      const archList = Array.isArray(archivedRes?.data) ? archivedRes.data : [];
      setBottomArchivedCount(archList.length);

      (async () => {
        const ids = archList.map((o) => o.id).filter(Boolean);
        const totals = await computeTotalsFromOrders(ids, { limit: 30, mode: "SHIPPED" });
        if (aliveRef.current) setBottomShipTotals(totals);
      })();

      setProducedCount(Number(producedRes?.count ?? 0));
      const t = producedRes?.totals;
      setProducedTotals({
        bigbag: Number(t?.bigbag ?? 0),
        roche: Number(t?.roche ?? 0),
      });
    } catch {
      if (!aliveRef.current) return;
      setBottomArchivedCount(0);
      setBottomShipTotals({ bigbag: 0, roche: 0 });
      setProducedCount(0);
      setProducedTotals({ bigbag: 0, roche: 0 });
    }
  }, [periodBottom]);

  useEffect(() => {
    runBottom();
  }, [runBottom]);

  const refreshAll = useCallback(async ({ silent = false } = {}) => {
    await Promise.all([
      runTop({ silent }),
      runBottom(), // pas besoin de silent ici
    ]);
  }, [runTop, runBottom]);

  const refreshAllSilent = useCallback(() => refreshAll({ silent: true }), [refreshAll]);

  useEffect(() => {
    return registerRefresh(refreshAllSilent);
  }, [registerRefresh, refreshAllSilent]);


  if (loading)
    return <div className="p-6 text-xs text-gf-subtitle">Chargement…</div>;
  if (error) return <div className="p-6 text-xs text-gf-danger">{error}</div>;

  const lineTopProduce = `${topProduceTotals.bigbag} BigBag - ${topProduceTotals.roche} Roche`;
  const lineTopToday = `${topTodayShipTotals.bigbag} BigBag - ${topTodayShipTotals.roche} Roche`;
  const lineBottomShip = `${bottomShipTotals.bigbag} BigBag - ${bottomShipTotals.roche} Roche`;
  const lineProduced = `${producedTotals.bigbag} BigBag - ${producedTotals.roche} Roche`;

  return (
    <div className="p-4 md:p-6 bg-white md:bg-transparent">
      {/* DESKTOP */}
      <div className="hidden md:block">
        <div>
          <div className="gf-h1">Tableau de bord administrateur</div>

          <div className="mt-3 flex justify-center">
            <div className="text-gf-orange font-semibold">
              Bonjour {firstName || "Administrateur"}
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-12">
            <KpiCard
              title="Commandes à produire"
              value={produceCount}
              lines={[`dont ${produceUrgentCount} urgentes`, lineTopProduce]}
            />

            <KpiCard
              title="Expéditions du jour"
              value={todayArchivedCount}
              lines={["Aujourd’hui", lineTopToday]}
            />
          </div>

          <div className="mt-8">
            <div className="gf-h3 mb-2">Commandes urgentes</div>
            <UrgentTable
              rows={urgentRows}
              onView={() => navigate("/bureau/commandes")}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="col-span-1 space-y-3">
              {/* Selecteur uniquement sur le bloc bas */}
              <div className="w-[220px]">
                <div className="text-xs text-gf-subtitle mb-1">Période</div>
                <select
                  value={periodBottom}
                  onChange={(e) => setPeriodBottom(e.target.value)}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-surface px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                >
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat
                  title="Expéditions effectuées"
                  value={bottomArchivedCount}
                  subtitle={lineBottomShip}
                />

                <MiniStat
                  title="Commandes produites"
                  value={producedCount}
                  subtitle={lineProduced}
                />
              </div>
            </div>
            <div className="col-span-1">
              <ActivityList items={activities} />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden">
        <div className="p-0">
          <div className="gf-h1 text-center">
            Tableau de bord administrateur
          </div>

          <div className="mt-2 text-center text-gf-orange font-semibold">
            Bonjour {firstName || "Administrateur"}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <KpiCard
              title="Commandes à produire"
              value={produceCount}
              lines={[`dont ${produceUrgentCount} urgentes`, lineTopProduce]}
            />
            <KpiCard
              title="Expéditions du jour"
              value={todayArchivedCount}
              lines={[lineTopToday]}
            />
          </div>

          <div className="mt-4">
            <div className="text-xs text-center font-medium text-gf-subtitle mb-2">
              Commandes urgentes
            </div>

            <div className="space-y-3 text-center">
              {urgentRows.length ? (
                urgentRows.map((o) => (
                  <div
                    key={o.id ?? o.arc}
                    className="rounded-md border border-gf-border bg-gf-bg px-4 py-3 text-xs"
                  >
                    {/* ARC */}
                    <div className="text-[11px] text-gf-subtitle">
                      N° ARC {o.arc ?? "—"}
                    </div>

                    {/* Client */}
                    <div className="mt-0.5 font-semibold text-gf-title">
                      {o.client_name ?? "—"}
                    </div>

                    {/* Enlèvement */}
                    {o.pickup_date ? (
                      <div className="mt-1 text-[11px] text-gf-subtitle">
                        Enlèvement prévu : {o.pickup_date}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-gf-border bg-gf-bg p-3 text-xs text-gf-subtitle">
                  Aucune commande urgente.
                </div>
              )}
            </div>
          </div>

          {/* Selecteur + mini stats en bas */}
          <div className="mt-4">
            <div className="text-xs text-gf-subtitle mb-1">Période</div>
            <select
              value={periodBottom}
              onChange={(e) => setPeriodBottom(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat
              title="Expéditions effectuées"
              value={bottomArchivedCount}
              subtitle={lineBottomShip}
            />
            <MiniStat
              title="Commandes produites"
              value={producedCount}
              subtitle={lineProduced}
            />
          </div>

          <div className="mt-4">
            <ActivityList items={activities} />
          </div>
        </div>
      </div>
    </div>
  );
}
