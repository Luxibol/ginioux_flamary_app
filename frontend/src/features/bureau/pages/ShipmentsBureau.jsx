import { useEffect, useState } from "react";
import { RefreshCw, Archive, ChevronDown, ChevronUp, Mail } from "lucide-react";
import {
  getBureauPendingShipments,
  ackOrderShipments,
} from "../../../services/shipments.api.js";
import { formatDateFr } from "../utils/orders.format.js";
import OrderCommentsThread from "../../../components/comments/OrderCommentsThread.jsx";
import { formatKg, formatTons } from "../utils/weight.format.js";

function formatDateTimeFr(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sumPendingWeightKg(pendingShipments = []) {
  let total = 0;

  for (const s of pendingShipments || []) {
    for (const l of s.lines || []) {
      const qty = Number(l.quantity_loaded ?? 0);
      const w = Number(l.weight_per_unit_kg ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(w)) continue;
      total += qty * w;
    }
  }

  return total;
}

function etatLabel(expeditionStatus) {
  if (expeditionStatus === "EXP_COMPLETE") return "Complète";
  if (expeditionStatus === "EXP_PARTIELLE") return "Partielle";
  return "—";
}

function etatDotClass(expeditionStatus) {
  if (expeditionStatus === "EXP_COMPLETE") return "bg-gf-success";
  if (expeditionStatus === "EXP_PARTIELLE") return "bg-yellow-400";
  return "bg-gf-border";
}

export default function ShipmentsBureau() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [ackingId, setAckingId] = useState(null);

  const [commentsOpenById, setCommentsOpenById] = useState({});

  const applyCounts = (orderId, counts) => {
    setRows((prev) =>
      prev.map((r) =>
        r.order?.id === orderId
          ? {
              ...r,
              order: {
                ...r.order,
                messagesCount: Number(counts?.messagesCount ?? 0),
                unreadCount: Number(counts?.unreadCount ?? 0),
              },
            }
          : r
      )
    );
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getBureauPendingShipments();
      setRows(res.data || []);
      setCount(res.count || (res.data || []).length);
      setExpandedId(null);
      setCommentsOpenById({});
    } catch (e) {
      setError(e.message || "Erreur.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRow = (orderId) => {
    setExpandedId((prev) => {
      const next = prev === orderId ? null : orderId;

      // si on ferme la ligne -> on ferme aussi les commentaires
      if (next === null) {
        setCommentsOpenById((m) => ({ ...m, [orderId]: false }));
      }

      return next;
    });
  };

  const onArchive = async (orderId) => {
    try {
      setAckingId(orderId);
      setError("");
      await ackOrderShipments(orderId);
      await load(); // la commande doit disparaitre si plus de shipments en attente
    } catch (e) {
      setError(e.message || "Erreur archivage.");
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="gf-h1">Expéditions</h1>
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

      {/* Content */}
      <div className="mt-6 gf-card overflow-hidden">
        {error ? (
          <div className="p-4 gf-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 gf-empty">
            {loading ? "Chargement…" : "Aucune expédition en attente."}
          </div>
        ) : (
          <div className="text-xs">
            {/* Header style tableau (maquette) */}
            <div className="bg-gf-bg text-gf-subtitle">
              <div className="p-3">
                <div
                  className="grid items-center px-4 py-3 gap-3 font-medium justify-items-center"
                  style={{
                    gridTemplateColumns: "120px 1fr 170px 160px 220px 40px",
                  }}
                >
                  <div>N° ARC</div>
                  <div>Client</div>
                  <div>Date expédition</div>
                  <div>État commande</div>
                  <div>Actions</div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* Liste de cartes */}
            <div className="p-3 bg-gf-bg">
              <div className="space-y-3">
                {rows.map((r) => {
                  const o = r.order;
                  const isOpen = expandedId === o.id;
                  const pendingWeightKg = sumPendingWeightKg(r.pending_shipments);

                  return (
                    <div
                      key={o.id}
                      className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
                    >
                      {/* Ligne haute */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleRow(o.id)}
                        onKeyDown={(e) => e.key === "Enter" && toggleRow(o.id)}
                        className="cursor-pointer"
                      >
                        <div
                          className="grid items-center px-4 py-3 gap-3 hover:bg-gf-orange/5 justify-items-center"
                          style={{
                            gridTemplateColumns:
                              "120px 1fr 170px 160px 220px 40px",
                          }}
                        >
                          <div className="font-medium text-gf-title">
                            {o.arc}
                          </div>
                          <div className="justify-center">{o.client_name}</div>
                          <div>{formatDateTimeFr(o.last_departed_at)}</div>

                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${etatDotClass(
                                o.expedition_status
                              )}`}
                            />
                            <span>{etatLabel(o.expedition_status)}</span>
                          </div>

                          <div className="flex justify-center items-center gap-2">
                            {/* Enveloppe + badge (place réservée) */}
                            <div className="relative h-8 w-8 grid place-items-center">
                              {Number(o.messagesCount ?? 0) > 0 ? (
                                <button
                                  type="button"
                                  className="relative text-gf-orange hover:opacity-80"
                                  title="Messages"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    // ouvrir la ligne si besoin (utilise toggleRow pour garder la logique de fermeture commentaires)
                                    if (!isOpen) toggleRow(o.id);

                                    // ouvrir commentaires
                                    setCommentsOpenById((prev) => ({ ...prev, [o.id]: true }));
                                  }}
                                >
                                  <Mail className="h-4 w-4" />
                                  {Number(o.unreadCount ?? 0) > 0 ? (
                                    <span className="absolute -top-2 -left-2 min-w-4 h-4 px-1 rounded-full bg-gf-orange text-white text-[10px] grid place-items-center">
                                      {Number(o.unreadCount ?? 0)}
                                    </span>
                                  ) : null}
                                </button>
                              ) : (
                                <span className="pointer-events-none opacity-0">
                                  <Mail className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive(o.id);
                              }}
                              disabled={ackingId === o.id}
                              className="gf-btn gf-btn-primary h-8 py-0"
                            >
                              <Archive className="h-4 w-4" />
                              {ackingId === o.id ? "…" : "Archiver"}
                            </button>
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

                      {/* Détails (accordéon) */}
                      {isOpen ? (
                        <div className="border-t border-gf-border bg-gf-surface">
                          <div className="px-4 py-4">
                            <div className="text-gf-title font-medium mb-2">
                              Détails de l’expédition - Commande {o.arc}
                            </div>

                            {/* 1) Shipments non ack */}
                            <div className="space-y-2">
                              {r.pending_shipments.map((s) => (
                                <div key={s.id} className="text-gf-text">
                                  <div className="text-gf-subtitle">
                                    Départ camion : {formatDateTimeFr(s.departed_at)}
                                  </div>
                                  <ul className="list-disc pl-5 mt-1 space-y-1">
                                    {s.lines.map((l, idx) => (
                                      <li key={`${s.id}-${l.product_id}-${idx}`}>
                                        <span className="font-medium">
                                          {l.quantity_loaded}
                                        </span>{" "}
                                        — {l.label}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            {/* 2) Récap + pickup date */}
                            <div className="mt-4 text-gf-subtitle">
                              <div>
                                Récap commande {o.arc} :{" "}
                                <span className="text-gf-title font-medium">
                                  {r.recap?.shipped_total ?? 0} /{" "}
                                  {r.recap?.ordered_total ?? 0} expédiés
                                </span>
                                 <span className="text-gf-subtitle">
                                    {" — "}
                                    <span className="text-gf-title font-medium">
                                      {formatKg(pendingWeightKg)}
                                    </span>
                                    {" ("}
                                    <span className="text-gf-title font-medium">
                                      {formatTons(pendingWeightKg)}
                                    </span>
                                    {")"}
                                  </span>
                              </div>
                              <div className="mt-1">
                                Jour d’enlèvement prévu :{" "}
                                <span className="text-gf-title">
                                  {formatDateFr(o.pickup_date)}
                                </span>
                              </div>
                            </div>

                            {/* 3) Reste à expédier */}
                            <div className="mt-4">
                              <div className="text-gf-title font-medium mb-1">
                                Reste à expédier
                              </div>

                              {r.remaining?.length ? (
                                <ul className="list-disc pl-5 space-y-1 text-gf-text">
                                  {r.remaining.map((x) => (
                                    <li key={`${o.id}-${x.product_id}`}>
                                      <span className="font-medium">
                                        {x.remaining_qty}
                                      </span>{" "}
                                      — {x.label}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-gf-subtitle text-xs">
                                  Rien à expédier : commande complète.
                                </div>
                              )}
                            </div>

                            {/* 4) Commentaires */}
                            <div className="mt-4">
                              <OrderCommentsThread
                                orderId={o.id}
                                open={true}
                                onCountsChange={applyCounts}
                                collapsed={!commentsOpenById[o.id]}
                                onCollapsedChange={(isCollapsed) =>
                                  setCommentsOpenById((prev) => ({ ...prev, [o.id]: !isCollapsed }))
                                }
                              />
                            </div>


                          </div>
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
