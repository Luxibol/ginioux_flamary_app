/**
 * Filtres - Admin Produits
 * - Recherche texte (Entrée => relance le chargement)
 * - Filtre par catégorie
 * - Filtre actif/inactif
 *
 * Props:
 * - q, setQ : état du champ recherche
 * - category, setCategory : filtre catégorie ("" | "BIGBAG" | "ROCHE" | "AUTRE")
 * - active, setActive : filtre actif ("" | "1" | "0")
 * - onSubmit : callback pour relancer la liste (typiquement load())
 */
export default function ProductsFilters({
  q,
  setQ,
  category,
  setCategory,
  active,
  setActive,
  onSubmit, // ex: load
}) {
  return (
    <div className="mt-6 grid grid-cols-12 gap-3">
      {/* Recherche */}
      <div className="col-span-6">
        <div className="text-xs text-gf-subtitle mb-1">Recherche</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="N° Référence / Libellé…"
          className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
        />
        <div className="mt-1 text-[11px] text-gf-subtitle">
          Appuie sur Entrée pour lancer la recherche.
        </div>
      </div>

      {/* Catégorie */}
      <div className="col-span-3">
        <div className="text-xs text-gf-subtitle mb-1">Catégorie</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
        >
          <option value="">Toutes</option>
          <option value="BIGBAG">Big bag</option>
          <option value="ROCHE">Roche</option>
          <option value="AUTRE">Autre</option>
        </select>
      </div>

      {/* Actif */}
      <div className="col-span-3">
        <div className="text-xs text-gf-subtitle mb-1">Actif</div>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
        >
          <option value="">Tous</option>
          <option value="1">Oui</option>
          <option value="0">Non</option>
        </select>
      </div>
    </div>
  );
}
