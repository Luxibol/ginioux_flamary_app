/**
 * Panneau "détails" affiché sous une commande (accordéon).
 * Affiche :
 * - les lignes produits (quantité prête / commandée + poids + libellé)
 * - des blocs "Expéditions" et "Commentaires" en placeholder (non branchés pour l’instant)
 */
import { n } from "../utils/orders.format.js";

/**
 * @param {object} props
 * @param {string} props.arc Référence ARC affichée dans le titre
 * @param {string} props.expeditionStatus Statut d'expédition (ex: EXP_PARTIELLE)
 * @param {{ lines?: Array<any> }} props.details Détails de commande (API: { order, lines })
 */
export default function OrderExpandedPanel({ arc, expeditionStatus, details }) {
  // Liste des lignes produits (fallback tableau vide si détails non chargés).
  const lines = details?.lines || [];

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

      {/* Placeholder : afficher l'historique des expéditions quand on aura la table + route dédiées. */}
      {expeditionStatus === "EXP_PARTIELLE" ? (
        <div className="mt-5">
          <div className="text-sm font-medium text-gf-title mb-2">
            Expéditions déjà effectuées
          </div>
          <div className="text-xs text-gf-subtitle">
            (À brancher quand on aura la table/route expéditions)
          </div>
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
