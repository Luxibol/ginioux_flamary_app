// src/features/admin/components/ProductEditModal.jsx
import { CATEGORIES } from "../utils/adminProducts.utils.js";

/**
 * Modale - Édition d'un produit
 *
 * Props:
 * - open: boolean -> affiche/masque la modale
 * - loading: boolean -> désactive les actions pendant une requête
 * - editId: number|null -> id du produit en cours d’édition (affiché en header)
 * - eLabel, setELabel: champ libellé PDF
 * - eCategory, setECategory: champ catégorie
 * - eWeight, setEWeight: champ poids (string, conversion faite côté page)
 * - eActive, setEActive: champ actif (boolean)
 * - onClose: fermeture modale
 * - onSubmit: validation (typiquement onSaveEdit)
 */
export default function ProductEditModal({
  open,
  loading,
  eLabel,
  setELabel,
  eCategory,
  setECategory,
  eWeight,
  setEWeight,
  eActive,
  setEActive,
  onClose,
  onSubmit,
}) {
  // Si pas ouvert -> on ne rend rien (évite overlay + listeners inutiles)
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        {/* Header */}
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">
            Modifier un produit
          </div>
          <div className="text-xs text-gf-subtitle mt-1 truncate">
            {eLabel}
          </div>
        </div>

        {/* Form */}
        <div className="p-5 grid grid-cols-12 gap-3">
          {/* Libellé */}
          <div className="col-span-12">
            <div className="text-xs text-gf-subtitle mb-1">Libellé PDF exact</div>
            <input
              value={eLabel}
              onChange={(e) => setELabel(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            />
          </div>

          {/* Catégorie */}
          <div className="col-span-6">
            <div className="text-xs text-gf-subtitle mb-1">Catégorie</div>
            <select
              value={eCategory}
              onChange={(e) => setECategory(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Poids */}
          <div className="col-span-4">
            <div className="text-xs text-gf-subtitle mb-1">Poids (kg)</div>
            <input
              value={eWeight}
              onChange={(e) => setEWeight(e.target.value)}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            />
          </div>

          {/* Actif */}
          <div className="col-span-2">
            <div className="text-xs text-gf-subtitle mb-1">Actif</div>
            <select
              value={eActive ? "1" : "0"}
              onChange={(e) => setEActive(e.target.value === "1")}
              className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
            >
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </div>
        </div>

        {/* Actions */}
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
