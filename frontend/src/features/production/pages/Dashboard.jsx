import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getProductionOrders,
  getProductionShipments,
  getOrderDetails,
  getProductionShipmentsStats,
} from "../../../services/orders.api.js";

import { getUser } from "../../../services/auth.storage.js";

function normalizeFamily(line) {
  const cat = String(line?.category ?? "").toUpperCase().trim();
  if (cat === "ROCHE") return "ROCHE";
  if (cat === "BIGBAG") return "BIGBAG";

  const label = String(line?.label ?? "").toLowerCase();
  if (label.includes("roche")) return "ROCHE";
  if (label.includes("big") || label.includes("bag")) return "BIGBAG";
  return "OTHER";
}

async function computeTotalsFromOrders(orderIds, { limit = 25, mode = "ORDERED" } = {}) {
  const ids = Array.isArray(orderIds) ? orderIds.slice(0, limit) : [];
  let bigbag = 0;
  let roche = 0;

  for (const id of ids) {
    try {
      const details = await getOrderDetails(id);
      const lines = Array.isArray(details?.lines) ? details.lines : [];

      for (const l of lines) {
        const fam = normalizeFamily(l);

        const ordered = Number(l.quantity_ordered ?? 0);
        const shipped = Number(l.quantity_shipped ?? 0);
        const ready = Number(l.quantity_ready ?? 0);

        const raw =
          mode === "SHIPPED"
            ? shipped
            : mode === "READY"
              ? Math.max(ready - shipped, 0) // reste chargeable
              : ordered;

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

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gf-border bg-white shadow-sm px-4 py-4">
      <div className="text-center font-semibold text-gf-title">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const firstName = useMemo(() => {
    const user = getUser();
    return user?.first_name || "Employé";
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cards
  const [produceCount, setProduceCount] = useState(0);
  const [shipmentsToLoadCount, setShipmentsToLoadCount] = useState(0);

  const [produceTotals, setProduceTotals] = useState({ bigbag: 0, roche: 0 });
  const [toLoadTotals, setToLoadTotals] = useState({ bigbag: 0, roche: 0 });

  const [stats, setStats] = useState({
    week: { orders: 0, totals: { bigbag: 0, roche: 0 } },
    month: { orders: 0, totals: { bigbag: 0, roche: 0 } },
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const [prodRes, shipRes, statsRes] = await Promise.all([
          getProductionOrders({ limit: 200, offset: 0 }),
          getProductionShipments({ limit: 200, offset: 0 }),
          getProductionShipmentsStats(),
        ]);

        if (!alive) return;

        const prodList = Array.isArray(prodRes?.data) ? prodRes.data : [];
        const shipList = Array.isArray(shipRes?.data) ? shipRes.data : [];

        setProduceCount(prodList.length);
        setShipmentsToLoadCount(shipList.length);

        // Totaux à produire (quantity_ordered)
        (async () => {
          const ids = prodList.map((o) => o.id).filter(Boolean);
          const totals = await computeTotalsFromOrders(ids, { limit: 25, mode: "ORDERED" });
          if (alive) setProduceTotals(totals);
        })();

        // Totaux à charger (reste prêt = ready - shipped)
        (async () => {
          const ids = shipList.map((o) => o.id).filter(Boolean);
          const totals = await computeTotalsFromOrders(ids, { limit: 25, mode: "READY" });
          if (alive) setToLoadTotals(totals);
        })();

        // Stats expéditions
        setStats({
          week: {
            orders: Number(statsRes?.week?.orders ?? 0),
            totals: {
              bigbag: Number(statsRes?.week?.totals?.bigbag ?? 0),
              roche: Number(statsRes?.week?.totals?.roche ?? 0),
            },
          },
          month: {
            orders: Number(statsRes?.month?.orders ?? 0),
            totals: {
              bigbag: Number(statsRes?.month?.totals?.bigbag ?? 0),
              roche: Number(statsRes?.month?.totals?.roche ?? 0),
            },
          },
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Erreur lors du chargement du dashboard production.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-4 text-xs text-gf-subtitle">Chargement…</div>;
  if (error) return <div className="p-4 text-xs text-gf-danger">{error}</div>;

  const lineProduce = `À produire : ${produceTotals.bigbag} BigBag & SmallBag • ${produceTotals.roche} Roche`;
  const lineLoad = `À charger : ${toLoadTotals.bigbag} BigBag & SmallBag • ${toLoadTotals.roche} Roche`;

  const weekLine = `${stats.week.totals.bigbag} BigBag & SmallBag • ${stats.week.totals.roche} Roche`;
  const monthLine = `${stats.month.totals.bigbag} BigBag & SmallBag • ${stats.month.totals.roche} Roche`;

  return (
    <div className="p-4">
      <div className="text-center">
        <div className="gf-h1">Tableau de bord</div>
        <div className="mt-1 text-xs text-gf-subtitle">
          Vue d&apos;ensemble des commandes et expéditions
        </div>
        <div className="mt-2 font-semibold text-gf-orange">Bonjour {firstName}</div>
      </div>

      <div className="mt-4 space-y-4">
        <Card title="Commandes à produire">
          <div className="text-center text-3xl font-semibold text-gf-title">{produceCount}</div>
          <div className="mt-1 text-center text-xs text-gf-subtitle">Aujourd&apos;hui</div>

          <div className="mt-3 text-center text-xs text-gf-subtitle">{lineProduce}</div>

          <button
            onClick={() => navigate("/production/commandes")}
            className="mt-3 w-full text-center text-sm font-medium text-gf-orange"
          >
            Voir les commandes
          </button>
        </Card>

        <Card title="Expéditions à charger">
          <div className="text-center text-3xl font-semibold text-gf-title">{shipmentsToLoadCount}</div>
          <div className="mt-1 text-center text-xs text-gf-subtitle">Prêtes à charger</div>

          <div className="mt-3 text-center text-xs text-gf-subtitle">{lineLoad}</div>

          <button
            onClick={() => navigate("/production/expeditions")}
            className="mt-3 w-full text-center text-sm font-medium text-gf-orange"
          >
            Voir les expéditions
          </button>
        </Card>

        <Card title="Expéditions effectuées">
          <div className="text-center text-gf-orange font-semibold">Semaine : {stats.week.orders} commandes</div>
          <div className="mt-1 text-center text-xs text-gf-subtitle">{weekLine}</div>

          <div className="mt-4 text-center text-gf-orange font-semibold">Mois : {stats.month.orders} commandes</div>
          <div className="mt-1 text-center text-xs text-gf-subtitle">{monthLine}</div>
        </Card>
      </div>
    </div>
  );
}
