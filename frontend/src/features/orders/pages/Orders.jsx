/**
 * Page "Commandes en cours" :
 * - liste des commandes actives (avec filtres)
 * - accordéon par ligne pour charger/afficher les détails (lazy-load + cache)
 * - édition via modale (PATCH)
 * - suppression (DELETE)
*/
import { useEffect, useState } from "react";
import {RefreshCw, Mail, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OrderModal from "../components/OrderModal.jsx";
import { getActiveOrders, getOrderDetails, patchOrderMeta, deleteOrder } from "../../../services/orders.api.js";
import OrderExpandedPanel from "../components/OrderExpandedPanel.jsx";
import { formatDateFr, priorityClass, priorityLabel } from "../utils/orders.format.js";
import {mapModalToPatchPayload, mapOrderDetailsToModal } from "../mappers/orders.mappers.js";

// Options UI pour filtres (valeurs backend attendues dans query params).
const PRIORITIES = [
  { value: "", label: "Priorité (toutes)" },
  { value: "URGENT", label: "Urgent" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "NORMAL", label: "Normal" },
];

const STATES = [
  { value: "", label: "État (tous)" },
  { value: "EN_PREPARATION", label: "En préparation" },
  { value: "PRETE_A_EXPEDIER", label: "Prête à expédier" },
  { value: "PARTIELLEMENT_EXPEDIEE", label: "Partiellement expédiée" },
  { value: "EXPEDIEE", label: "Expédiée" },
];

export default function Orders() {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [state, setState] = useState("");

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  // Cache des détails par commande (évite de re-fetch quand on replie/déplie la même ligne).
  const [detailsById, setDetailsById] = useState({});
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);

  /**
   * Ouvre/ferme l'accordéon d'une commande.
   * Si ouverture : charge les détails uniquement la première fois (lazy-load) puis met en cache.
  */
  const toggleRow = async (o) => {
    const next = expandedId === o.id ? null : o.id;
    setExpandedId(next);

    // si on ferme -> rien d'autre
    if (!next) return;

    // Si détails déjà chargés, on ne refait pas d'appel API.
    if (detailsById[o.id]) return;

    try {
      setDetailsLoadingId(o.id);
      const details = await getOrderDetails(o.id); // { order, lines }
      setDetailsById((prev) => ({ ...prev, [o.id]: details }));
    } catch (e) {
      setError(e.message || "Erreur chargement détails.");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  /**
   * Supprime une commande (avec confirmation UI), puis recharge la liste.
  */
  const onDelete = async (o) => {
    if (!confirm(`Supprimer la commande ${o.arc} ?`)) return;

    try {
      setLoading(true);
      setError("");

      await deleteOrder(o.id);

      if (expandedId === o.id) setExpandedId(null);

      await load();
    } catch (e) {
      setError(e.message || "Erreur suppression.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ouvre la modale d'édition :
   * - fetch détails
   * - map API -> modèle de modale
  */
  const openEdit = async (o) => {
    try {
      setLoading(true);
      setError("");

      const details = await getOrderDetails(o.id);
      setSelectedOrder(mapOrderDetailsToModal(details));
      setModalOpen(true);
    } catch (e) {
      setError(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  /**
    * Charge la liste des commandes actives selon les filtres.
    * Reset aussi l'accordéon + le cache détails pour repartir sur une liste propre.
  */
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getActiveOrders({
        q: q.trim() || undefined,
        priority: priority || undefined,
        state: state || undefined,
      });
      setRows(res.data || []);
      setExpandedId(null);
      setDetailsById({});
      setDetailsLoadingId(null);
      setCount(res.count || 0);
    } catch (e) {
      setError(e.message || "Erreur.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Recharge automatiquement quand les filtres changent (hors recherche texte).
  useEffect(() => {
    load();
    // On ne met pas `load` en dépendance pour éviter une boucle (load est recréée à chaque render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, state]);

  /**
   * Validation de la modale (édition commande existante) :
   * - PATCH la commande
   * - reload la liste
   * - recharge les détails de la commande pour garder le cache à jour
  */
  const handleConfirmModal = async (payload) => {
    try {
      setLoading(true);
      setError("");

      const id = selectedOrder.id;

      await patchOrderMeta(id, mapModalToPatchPayload(payload));

      await load();

      const freshDetails = await getOrderDetails(id);
      setDetailsById((prev) => ({ ...prev, [id]: freshDetails }));

      setModalOpen(false);
      setSelectedOrder(null);
    } catch (e) {
      setError(e.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="gf-h1">Commandes en cours</h1>
          <div className="gf-body text-gf-subtitle mt-1">
            {loading ? "Chargement…" : `${count} commande(s)`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/bureau/import")}
            className="h-9 rounded-md bg-gf-orange px-4 text-white text-xs font-medium hover:opacity-90"
          >
            Importer PDF
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-9 inline-flex items-center gap-2 rounded-md border border-gf-border bg-gf-surface px-3 text-xs hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-12 gap-3">
        <div className="col-span-6">
          <div className="text-xs text-gf-subtitle mb-1">Rechercher</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            // La recherche (q) se lance uniquement sur Entrée pour éviter des appels API à chaque frappe.
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="ARC ou client…"
            className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
          />
          <div className="mt-1 text-[11px] text-gf-subtitle">
            Appuie sur Entrée pour lancer la recherche.
          </div>
        </div>

        <div className="col-span-3">
          <div className="text-xs text-gf-subtitle mb-1">Priorité</div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-3">
          <div className="text-xs text-gf-subtitle mb-1">
            État de la commande
          </div>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
          >
            {STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 rounded-2xl border border-gf-border bg-gf-surface overflow-hidden">
        {error ? (
          <div className="p-4 text-xs text-gf-danger">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-xs text-gf-subtitle">
            {loading
              ? "Chargement…"
              : "Aucune commande ne correspond aux filtres."}
          </div>
        ) : (
          <div className="text-xs">
            {/* Header style tableau */}
            <div className="bg-gf-bg text-gf-subtitle">
              <div className="p-3">
                <div
                  className="grid items-center px-4 py-3 gap-3 font-medium justify-items-center"
                  style={{
                    gridTemplateColumns:
                      "110px 1fr 120px 120px 120px 1fr 280px",
                  }}
                >
                  <div>ARC</div>
                  <div>Client</div>
                  <div>Commande</div>
                  <div>Enlèvement</div>
                  <div>Priorité</div>
                  <div>État</div>
                  <div>Actions</div>
                </div>
              </div>
            </div>

            {/* Liste de cartes */}
            <div className="p-3 bg-gf-bg">
              <div className="space-y-3">
                {rows.map((o) => {
                  const isOpen = expandedId === o.id;
                  const details = detailsById[o.id];
                  const loadingDetails = detailsLoadingId === o.id;

                  // Chaque carte = une commande ; clic sur la ligne => toggle accordéon + chargement des détails si besoin.
                  return (
                    <div
                      key={o.id}
                      className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
                    >
                      {/* Ligne haute (dans le même bloc) */}
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
                              "110px 1fr 120px 120px 120px 1fr 280px",
                          }}
                        >
                          <div className="font-medium text-gf-title">
                            {o.arc}
                          </div>
                          <div>{o.client_name}</div>
                          <div>{formatDateFr(o.order_date)}</div>
                          <div>{formatDateFr(o.pickup_date)}</div>

                          <div
                            className={`font-medium ${priorityClass(o.priority)}`}
                          >
                            {priorityLabel(o.priority)}
                          </div>

                          <div>{o.order_state_label || "—"}</div>
                          {/* Actions */}
                          <div className="flex justify-center items-center gap-2">
                            {/* Enveloppe (future) */}
                            {o.messagesCount > 0 ? (
                              <button
                                type="button"
                                className="relative text-gf-orange hover:opacity-80"
                                title="Messages"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-4 w-4" />
                                {o.unreadCount > 0 ? (
                                  <span className="absolute -top-2 -left-2 min-w-4 h-4 px-1 rounded-full bg-gf-orange text-white text-[10px] grid place-items-center">
                                    {o.unreadCount}
                                  </span>
                                ) : null}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(o);
                              }}
                              className="h-8 px-3 rounded-md bg-gf-border/40 text-gf-title text-xs inline-flex items-center gap-2 hover:opacity-90"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="h-8 px-3 rounded-md bg-gf-danger text-white text-xs inline-flex items-center gap-2 hover:opacity-90"
                              title="Supprimer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(o);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </button>

                            <span className="text-gf-subtitle">
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Détails (toujours dans le même bloc) */}
                      {isOpen ? (
                        <div className="border-t border-gf-border bg-gf-surface">
                          {loadingDetails ? (
                            <div className="px-4 py-4 text-xs text-gf-subtitle">
                              Chargement des détails…
                            </div>
                          ) : (
                            <OrderExpandedPanel
                              arc={o.arc}
                              expeditionStatus={o.expedition_status}
                              details={details}
                            />
                          )}
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
      {/* Force le remount de la modale à chaque ouverture/changement de commande (reset des states internes). */}
      <OrderModal
        key={`${selectedOrder?.id ?? "new"}-${modalOpen}`}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedOrder(null); }}
        onConfirm={handleConfirmModal}
        context="orders"
        data={selectedOrder}
      />
    </div>
  );
}
