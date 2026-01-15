/**
 * Panneau "détails" affiché sous une commande (accordéon).
 * Affiche :
 * - les lignes produits (quantité prête / commandée + poids + libellé)
 * - des blocs "Expéditions" et "Commentaires" en placeholder (non branchés pour l’instant)
 */
import { n } from "../utils/orders.format.js";
import { useEffect, useState } from "react";
import { getOrderShipments } from "../../../services/orders.api.js";

/**
 * @param {object} props
 * @param {string} props.arc Référence ARC affichée dans le titre
 * @param {string} props.expeditionStatus Statut d'expédition (ex: EXP_PARTIELLE)
 * @param {{ lines?: Array<any> }} props.details Détails de commande (API: { order, lines })
 */
export default function OrderExpandedPanel({ arc, expeditionStatus, details }) {
  // Liste des lignes produits (fallback tableau vide si détails non chargés).
  const lines = details?.lines || [];

  const orderId = details?.order?.id;
  const [shipments, setShipments] = useState([]);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    if (expeditionStatus === "NON_EXPEDIEE") return;

    let cancelled = false;

    (async () => {
      try {
        setShipLoading(true);
        setShipError("");
        const res = await getOrderShipments(orderId);
        if (!cancelled) setShipments(res.shipments || []);
      } catch (e) {
        if (!cancelled) setShipError(e.message || "Erreur chargement expéditions.");
      } finally {
        if (!cancelled) setShipLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orderId, expeditionStatus]);


  return (
    <div className="px-4 py-4">
      <div className="text-sm font-semibold text-gf-title mb-3">
        Détails de la commande {arc}
      </div>

      <div className="space-y-1 text-xs text-gf-text">
        {lines.length === 0 ? (
          <div className="text-gf-subtitle">Aucune ligne produit.</div>
        ) : (
          lines.map((l) => {
            // n() sécurise les valeurs numériques (undefined/null -> 0) pour éviter NaN à l'affichage.
            const ready = n(l.quantity_ready);
            const ordered = n(l.quantity_ordered);
            const w = l.weight_per_unit_kg
              ? `${n(l.weight_per_unit_kg)} kg`
              : "—";

            return (
              <div key={l.id} className="flex items-baseline gap-2">
                <span className="font-semibold">
                  {ready} / {ordered} prêts
                </span>
                <span className="text-gf-subtitle">- {w} -</span>
                <span className="truncate">{l.label}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Placeholder : afficher l'historique des expéditions */}
      {expeditionStatus === "EXP_PARTIELLE" ? (
        <div className="mt-5">
          <div className="text-sm font-medium text-gf-title mb-2">
            Expéditions déjà effectuées
          </div>

          {shipLoading ? (
            <div className="text-xs text-gf-subtitle">Chargement…</div>
          ) : shipError ? (
            <div className="text-xs text-gf-danger">{shipError}</div>
          ) : shipments.length === 0 ? (
            <div className="text-xs text-gf-subtitle">Aucune expédition enregistrée.</div>
          ) : (
            <div className="space-y-3 text-xs">
              {shipments.map((s, idx) => (
                <div key={s.id} className="rounded-md border border-gf-border bg-gf-bg p-3">
                  <div className="text-gf-subtitle font-medium mb-2">
                    Expédition {idx + 1} — {new Date(s.departed_at).toLocaleString("fr-FR")}
                  </div>

                  <div className="space-y-1 text-gf-text">
                    {s.lines.map((l, i) => (
                      <div key={`${s.id}-${l.product_id}-${i}`} className="flex gap-2">
                        <span className="font-semibold">{l.quantity_loaded}</span>
                        <span className="truncate">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5">
        <div className="text-sm font-medium text-gf-title mb-2">
          {/* Placeholder : zone commentaires désactivée en attendant l'auth + table commentaires. */}
          Commentaires
        </div>

        <div className="text-xs text-gf-subtitle mb-2">
          (À brancher quand on aura l’auth + table commentaires)
        </div>

        {/* UI non active : on garde le layout, mais aucune écriture en base pour l'instant. */}
        <textarea
          disabled
          className="w-full rounded-md border border-gf-border bg-gf-bg p-3 text-xs text-gf-text outline-none"
          rows={2}
          placeholder="Saisissez votre commentaire…"
        />

        <div className="mt-3 flex justify-end gap-3">
          <button
            type="button"
            disabled
            className="h-9 rounded-md border border-gf-border bg-gf-bg px-5 text-xs opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled
            className="h-9 rounded-md bg-gf-orange px-6 text-xs font-medium text-white opacity-60"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
