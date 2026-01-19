import { useEffect, useMemo, useState } from "react";

import { getActiveOrders } from "../../../services/orders.api.js";
import { getBureauPendingShipments } from "../../../services/shipments.api.js";
import { getArchivedOrders } from "../../../services/history.api.js";

import BureauKpiCard from "../components/BureauKpiCard.jsx";
import BureauListBlock from "../components/BureauListBlock.jsx";

import { formatDateFr } from "../utils/orders.format.js";

import { toNumber } from "../utils/orders.format.js";

import { getUser } from "../../../services/auth.storage.js";

export default function Dashboard() {
  const firstName = useMemo(() => {
    const user = getUser();
    return user?.first_name || "Secrétaire";
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTotal, setActiveTotal] = useState(0);
  const [urgentTotal, setUrgentTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [urgentTop, setUrgentTop] = useState([]);
  const [archivedTop, setArchivedTop] = useState([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const [activeRes, urgentCountRes, urgentListRes, pendingRes, archivedRes] =
          await Promise.all([
            getActiveOrders({ limit: 1, offset: 0 }),
            getActiveOrders({ priority: "URGENT", limit: 1, offset: 0 }),  // KPI urgent (total)
            getActiveOrders({ priority: "URGENT", limit: 5, offset: 0 }),  // LISTE urgent (5)
            getBureauPendingShipments(),
            getArchivedOrders(),
          ]);
        if (!alive) return;

        setActiveTotal(toNumber(activeRes?.total ?? activeRes?.count));
        setUrgentTotal(toNumber(urgentCountRes?.total ?? urgentCountRes?.count));
        setPendingCount(toNumber(pendingRes?.count));

        const uTop = Array.isArray(urgentListRes?.data) ? urgentListRes.data : [];
        setUrgentTop(uTop.slice(0, 5));

        const arch = Array.isArray(archivedRes?.data) ? archivedRes.data : [];
        setArchivedTop(arch.slice(0, 5));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Erreur lors du chargement du dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  const urgentLines = useMemo(() => {
    return urgentTop.slice(0, 5).map((o) => {
      return `${o.arc || "—"} — ${o.client_name || "Client —"} — ${o.priority || "URGENT"} — ${
        o.order_state_label || "—"
      }`;
    });
  }, [urgentTop]);

  const archivedLines = useMemo(() => {
    return archivedTop.slice(0, 5).map((o) => {
      return `${o.arc || "—"} — ${o.client_name || "Client —"} — Expédiée le ${formatDateFr(
        o.last_departed_at
      )}`;
    });
  }, [archivedTop]);

  if (loading) {
    return <div className="p-4 gf-empty">Chargement…</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="gf-card gf-card-pad">
          <div className="gf-h3">Erreur</div>
          <div className="mt-2 gf-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header de page */}
      <div>
        <h1 className="gf-h1">Tableau de bord</h1>
        <div className="mt-1 text-xs text-gf-subtitle">
          Vue d&apos;ensemble des commandes et expéditions.
        </div>

        <div className="mt-4 text-center font-semibold text-gf-orange">
          Bonjour {firstName}
        </div>

        {/* Panneau gris */}
        <div className="mt-5 rounded-md border border-gf-border bg-gf-bg px-8 pt-10 pb-8 min-h-[420px]">
          {/* KPI centrés */}
          <div className="flex flex-wrap justify-center gap-48">
            <BureauKpiCard title="Commandes en cours" value={activeTotal} lines={["Actives"]} />
            <BureauKpiCard
              title="Commandes urgentes"
              value={urgentTotal}
              lines={["Priorité haute"]}
              dot={urgentTotal > 0}
            />
            <BureauKpiCard
              title="Expéditions à traiter"
              value={pendingCount}
              lines={["À accuser réception"]}
            />
          </div>

          {/* Deux colonnes bas */}
          <div className="mt-14">
            <div className="pl-48">
              <h2 className="gf-h2">À surveiller</h2>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-10 pl-48">
              <BureauListBlock
                title="Commandes urgentes"
                items={urgentLines}
                linkTo="/bureau/commandes"
                linkLabel="Voir toutes les commandes"
              />

              <BureauListBlock
                title="Dernières expéditions"
                items={archivedLines}
                linkTo="/bureau/historique"
                linkLabel="Voir l'historique d'expéditions"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
