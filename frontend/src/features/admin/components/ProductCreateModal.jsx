/**
 * Modale — Admin Produits : création.
 */
import { CATEGORIES } from "../utils/adminProducts.utils.js";

/**
 * Modale de création d'un produit.
 * @param {object} props
 * @param {boolean} props.open Affiche/masque la modale
 * @param {boolean} props.loading Désactive les actions pendant une requête
 * @param {string} props.fLabel Libellé PDF exact
 * @param {(v:string)=>void} props.setFLabel Setter libellé
 * @param {string} props.fCategory Catégorie
 * @param {(v:string)=>void} props.setFCategory Setter catégorie
 * @param {string} props.fWeight Poids (kg) saisi
 * @param {(v:string)=>void} props.setFWeight Setter poids
 * @param {boolean} props.fActive Actif/inactif
 * @param {(v:boolean)=>void} props.setFActive Setter actif
 * @param {()=>void} props.onClose Fermeture
 * @param {()=>void} props.onSubmit Validation
 * @returns {import("react").JSX.Element|null}
 */
export default function ProductCreateModal({
  open,
  loading,
  fLabel,
  setFLabel,
  fCategory,
  setFCategory,
  fWeight,
  setFWeight,
  fActive,
  setFActive,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">
            Ajouter un produit
          </div>
          <div className="text-xs text-gf-subtitle mt-1">
            Libellé PDF exact + catégorie + poids.
          </div>
        </div>

        <div className="p-5 grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <div className="text-xs text-gf-subtitle mb-1">
              Libellé PDF exact
            </div>
            <input
              value={fLabel}
              onChange={(e) => setFLabel(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Ex: (28) BIG BAG 1000KG ..."
            />
          </div>

          <div className="col-span-6">
            <div className="text-xs text-gf-subtitle mb-1">Catégorie</div>
            <select
              value={fCategory}
              onChange={(e) => setFCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-4">
            <div className="text-xs text-gf-subtitle mb-1">Poids (kg)</div>
            <input
              value={fWeight}
              onChange={(e) => setFWeight(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="1000"
            />
          </div>

          <div className="col-span-2">
            <div className="text-xs text-gf-subtitle mb-1">Actif</div>
            <select
              value={fActive ? "1" : "0"}
              onChange={(e) => setFActive(e.target.value === "1")}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            >
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </div>
        </div>

        <div className="p-5 border-t border-gf-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="gf-btn h-9 px-5 text-xs"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="gf-btn gf-btn-primary h-9 px-6 text-xs"
            disabled={loading}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
