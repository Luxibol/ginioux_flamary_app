/**
 * Bureau — Historique
 * - Liste des commandes archivées (recherche + période)
 * - Détails d’une commande au clic (lazy load + cache)
 */
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  getArchivedOrders,
  getArchivedOrderHistory,
} from "../../../services/history.api.js";
import {
  formatDateFr,
  priorityClass,
  priorityLabel,
} from "../utils/orders.format.js";
import OrderCommentsThread from "../../../components/comments/OrderCommentsThread.jsx";

/** Options de filtre de période (côté API historique). */
const PERIODS = [
  { value: "ALL", label: "Tout" },
  { value: "7D", label: "7 jours" },
  { value: "30D", label: "30 jours" },
  { value: "90D", label: "90 jours" },
];

/**
 * Formate une date/heure ISO pour l’UI (jj/mm/aaaa).
 * @param {string|Date|null|undefined} v Valeur date
 * @returns {string} Date formatée ou "—"
 */
function formatDateTimeFr(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Page Historique (Bureau).
 * @returns {import("react").JSX.Element}
 */
export default function HistoryBureau() {
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("ALL");

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [detailsById, setDetailsById] = useState({});
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);

  /**
   * Charge la liste des commandes archivées selon q + period.
   * Réinitialise l’expansion et le cache des détails.
   * @returns {Promise<void>}
   */
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getArchivedOrders({
        q: q.trim() || undefined,
        period: period || undefined,
      });
      setRows(res.data || []);
      setCount(res.count || 0);
      setExpandedId(null);
      setDetailsById({});
      setDetailsLoadingId(null);
    } catch (e) {
      setError(e.message || "Erreur.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Rechargement automatique quand la période change (recherche via Entrée).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  /**
   * Ouvre/ferme une ligne et charge les détails au premier expand.
   * @param {object} o Commande (row)
   * @returns {Promise<void>}
   */
  const toggleRow = async (o) => {
    const next = expandedId === o.id ? null : o.id;
    setExpandedId(next);

    if (!next) return;
    if (detailsById[o.id]) return;

    try {
      setDetailsLoadingId(o.id);
      const details = await getArchivedOrderHistory(o.id);
      setDetailsById((prev) => ({ ...prev, [o.id]: details }));
    } catch (e) {
      setError(e.message || "Erreur chargement détails.");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="gf-h1">Historique</h1>
          <div className="gf-body text-gf-subtitle mt-1">
            {loading ? "Chargement…" : `${count} commande(s)`}
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="gf-btn"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraîchir
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-12 gap-3">
        <div className="col-span-6">
          <div className="text-xs text-gf-subtitle mb-1">Recherche</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="N° ARC / client…"
            className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
          />
          <div className="mt-1 text-[11px] text-gf-subtitle">
            Appuie sur Entrée pour lancer la recherche.
          </div>
        </div>

        <div className="col-span-3">
          <div className="text-xs text-gf-subtitle mb-1">Période</div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 gf-card overflow-hidden">
        {error ? (
          <div className="p-4 gf-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 gf-empty">
            {loading ? "Chargement…" : "Aucune commande archivée."}
          </div>
        ) : (
          <div className="text-xs">
            {/* Header tableau */}
            <div className="bg-gf-bg text-gf-subtitle">
              <div className="p-3">
                <div
                  className="grid items-center px-4 py-3 gap-3 font-medium justify-items-center"
                  style={{
                    gridTemplateColumns:
                      "120px 1fr 120px 160px 120px 220px 40px",
                  }}
                >
                  <div>N° ARC</div>
                  <div>Client</div>
                  <div>Création</div>
                  <div>Dernière expédition</div>
                  <div>Priorité</div>
                  <div>Actions</div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="p-3 bg-gf-bg">
              <div className="space-y-3">
                {rows.map((o) => {
                  const isOpen = expandedId === o.id;
                  const details = detailsById[o.id];
                  const loadingDetails = detailsLoadingId === o.id;

                  return (
                    <div
                      key={o.id}
                      className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleRow(o)}
                        onKeyDown={(e) => e.key === "Enter" && toggleRow(o)}
                        className="cursor-pointer"
                      >
                        <div
                          className="grid items-center px-4 py-3 gap-3 hover:bg-gf-orange/5 justify-items-center"
                          style={{
                            gridTemplateColumns:
                              "120px 1fr 120px 160px 120px 220px 40px",
                          }}
                        >
                          <div className="font-medium text-gf-title">
                            {o.arc}
                          </div>
                          <div className="justify-center">{o.client_name}</div>
                          <div>{formatDateFr(o.order_date)}</div>
                          <div>{formatDateTimeFr(o.last_departed_at)}</div>

                          <div
                            className={`font-medium ${priorityClass(o.priority)}`}
                          >
                            {priorityLabel(o.priority)}
                          </div>

                          <div className="flex items-center justify-center">
                            <span className="gf-btn gf-btn-primary">
                              Détails
                            </span>
                          </div>

                          <span className="text-gf-subtitle">
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="border-t border-gf-border bg-gf-surface">
                          {loadingDetails ? (
                            <div className="px-4 py-4 gf-empty">
                              Chargement des détails…
                            </div>
                          ) : details ? (
                            <div className="px-4 py-4 space-y-4">
                              <div className="text-gf-title font-medium">
                                Commande {details.order.arc} -{" "}
                                {details.order.client_name}
                              </div>

                              <div className="text-gf-subtitle">
                                Créée le{" "}
                                {formatDateFr(details.order.order_date)} —
                                Dernière expédition le{" "}
                                {formatDateTimeFr(
                                  details.recap?.last_departed_at,
                                )}{" "}
                                — Jour d’enlèvement :{" "}
                                {formatDateFr(details.order.pickup_date)}
                                <br />
                                Récap :{" "}
                                <span className="text-gf-title font-medium">
                                  {details.recap?.shipped_total ?? 0} /{" "}
                                  {details.recap?.ordered_total ?? 0} expédiés
                                </span>{" "}
                                — {details.recap?.shipments_count ?? 0}{" "}
                                expédition(s)
                              </div>

                              <div>
                                <div className="text-gf-title font-medium mb-1">
                                  Lignes de commandes
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-gf-text">
                                  {details.lines.map((l) => (
                                    <li
                                      key={`${details.order.id}-${l.product_id}`}
                                    >
                                      <span className="font-medium">
                                        {l.quantity_shipped} /{" "}
                                        {l.quantity_ordered}
                                      </span>{" "}
                                      — {l.label}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <div className="text-gf-title font-medium mb-1">
                                  Expéditions
                                </div>
                                <div className="space-y-3">
                                  {details.shipments.map((s, idx) => (
                                    <div key={s.id} className="text-gf-text">
                                      <div className="text-gf-subtitle font-medium">
                                        Expédition {idx + 1} —{" "}
                                        {formatDateTimeFr(s.departed_at)}
                                      </div>
                                      <ul className="list-disc pl-5 mt-1 space-y-1">
                                        {s.lines.map((x, i) => (
                                          <li
                                            key={`${s.id}-${x.product_id}-${i}`}
                                          >
                                            <span className="font-medium">
                                              {x.quantity_loaded}
                                            </span>{" "}
                                            — {x.label}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <OrderCommentsThread
                                  orderId={details.order.id}
                                  open={true}
                                  readOnly={true}
                                  className="mt-2"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
