import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, Pencil } from "lucide-react";

import {
  listProducts,
  createProduct,
  patchProduct,
  deleteProduct,
} from "../../../services/adminProducts.api.js";

import { asNumber } from "../utils/adminProducts.utils.js";
import ProductCreateModal from "../components/ProductCreateModal.jsx";
import ProductEditModal from "../components/ProductEditModal.jsx";
import ProductsFilters from "../components/ProductsFilters.jsx";

/**
 * Page Admin - Gestion des produits
 *
 * Fonctions:
 * - Liste des produits (+ filtres)
 * - Création (modale)
 * - Modification (modale)
 * - Activation/Désactivation
 * - Suppression (si non référencé)
 *
 * Remarque UX:
 * - La recherche "q" est déclenchée à l'appui sur Entrée (via ProductsFilters)
 * - category/active déclenchent un reload automatiquement (useEffect)
 */
export default function AdminProducts() {
  // Filtres
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(""); // "" | "1" | "0"

  // Données
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  // États UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modale création
  const [openCreate, setOpenCreate] = useState(false);
  const [fLabel, setFLabel] = useState("");
  const [fCategory, setFCategory] = useState("AUTRE");
  const [fWeight, setFWeight] = useState("");
  const [fActive, setFActive] = useState(true);

  // Modale édition
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eLabel, setELabel] = useState("");
  const [eCategory, setECategory] = useState("AUTRE");
  const [eWeight, setEWeight] = useState("");
  const [eActive, setEActive] = useState(true);

  /**
   * Ouvre la modale d'édition en pré-remplissant les champs avec le produit sélectionné.
   */
  function openEditModal(p) {
    setEditId(p.id);
    setELabel(String(p.pdf_label_exact ?? ""));
    setECategory(String(p.category ?? "AUTRE"));
    setEWeight(String(p.weight_per_unit_kg ?? ""));
    setEActive(Boolean(p.is_active));
    setOpenEdit(true);
  }

  /**
   * Chargement de la liste des produits depuis l'API.
   * - Utilise q/category/active comme filtres côté backend
   * - Met à jour rows + count
   */
  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await listProducts({
        q: q.trim() || undefined,
        category: category || undefined,
        active: active !== "" ? active : undefined,
      });

      setRows(res.data || []);
      setCount(res.count || (res.data?.length ?? 0));
    } catch (e) {
      setError(e.message || "Erreur chargement produits.");
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Rechargement automatique quand category/active changent.
   * La recherche "q" est déclenchée manuellement (Entrée) via ProductsFilters.
   */
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, active]);

  /**
   * Création d'un produit via l'API.
   * - Valide libellé et poids
   * - Ferme la modale, reset le formulaire, recharge la liste
   */
  async function onCreate() {
    try {
      setLoading(true);
      setError("");

      const label = fLabel.trim();
      if (!label) throw new Error("Libellé PDF obligatoire.");

      const w = asNumber(fWeight);
      if (w === null || w <= 0) throw new Error("Poids invalide (ex: 1000).");

      await createProduct({
        pdf_label_exact: label,
        category: fCategory,
        weight_per_unit_kg: w,
        is_active: fActive ? 1 : 0,
      });

      // reset formulaire
      setOpenCreate(false);
      setFLabel("");
      setFCategory("AUTRE");
      setFWeight("");
      setFActive(true);

      await load();
    } catch (e) {
      setError(e.message || "Erreur création produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sauvegarde des modifications (modale édition).
   * - Patch partiel côté API
   * - Ferme la modale et recharge
   */
  async function onSaveEdit() {
    try {
      setLoading(true);
      setError("");

      const id = editId;
      if (!id) throw new Error("ID produit manquant.");

      const label = eLabel.trim();
      if (!label) throw new Error("Libellé PDF obligatoire.");

      const w = asNumber(eWeight);
      if (w === null || w <= 0) throw new Error("Poids invalide (ex: 1000).");

      await patchProduct(id, {
        pdf_label_exact: label,
        category: eCategory,
        weight_per_unit_kg: w,
        is_active: eActive ? 1 : 0,
      });

      setOpenEdit(false);
      setEditId(null);
      await load();
    } catch (e) {
      setError(e.message || "Erreur modification produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Toggle actif/inactif.
   * - On envoie uniquement is_active, le backend patch.
   */
  async function onToggleActive(p) {
    try {
      setLoading(true);
      setError("");
      await patchProduct(p.id, { is_active: p.is_active ? 0 : 1 });
      await load();
    } catch (e) {
      setError(e.message || "Erreur modification produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Suppression produit.
   * - Confirm() côté UI
   * - Backend renvoie 409 si produit référencé (message affiché via error)
   */
  async function onDelete(p) {
    if (!confirm(`Supprimer le produit ?\n\n${p.pdf_label_exact}`)) return;

    try {
      setLoading(true);
      setError("");
      await deleteProduct(p.id);
      await load();
    } catch (e) {
      setError(e.message || "Erreur suppression produit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="gf-h1">Gestion des produits</h1>
          <div className="gf-body text-gf-subtitle mt-1">
            {loading ? "Chargement…" : `${count} produit(s)`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="h-9 rounded-md bg-gf-orange px-4 text-white text-xs font-medium hover:opacity-90 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter
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

      {/* Filtres */}
      <ProductsFilters
        q={q}
        setQ={setQ}
        category={category}
        setCategory={setCategory}
        active={active}
        setActive={setActive}
        onSubmit={load}
      />

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-gf-border bg-gf-surface overflow-hidden">
        {error ? <div className="p-4 text-xs text-gf-danger">{error}</div> : null}

        {/* Header tableau */}
        <div className="bg-gf-bg text-gf-subtitle">
          <div className="p-3">
            <div
              className="grid items-center px-4 py-3 gap-3 font-medium text-xs justify-items-center"
              style={{
                gridTemplateColumns: "minmax(420px,1fr) 140px 120px 120px 220px",
              }}
            >
              <div className="justify-self-start">Libellé PDF</div>
              <div>Catégorie</div>
              <div>Poids (kg)</div>
              <div>Actif</div>
              <div>Actions</div>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="p-3 bg-gf-bg">
          {rows.length === 0 ? (
            <div className="p-4 text-xs text-gf-subtitle">
              {loading ? "Chargement…" : "Aucun produit."}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
                >
                  <div
                    className="grid items-center px-4 py-3 gap-3 text-xs"
                    style={{
                      gridTemplateColumns: "minmax(420px,1fr) 140px 120px 120px 220px",
                    }}
                  >
                    <div className="truncate text-gf-title font-medium">{p.pdf_label_exact}</div>
                    <div className="text-center">{p.category || "—"}</div>
                    <div className="text-center">{Number(p.weight_per_unit_kg ?? 0).toString()}</div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => onToggleActive(p)}
                        className={[
                          "h-7 px-3 rounded-md text-[11px] font-medium",
                          p.is_active
                            ? "bg-gf-success text-white"
                            : "bg-gf-border/50 text-gf-title",
                        ].join(" ")}
                        title="Activer / désactiver"
                        disabled={loading}
                      >
                        {p.is_active ? "Actif" : "Inactif"}
                      </button>
                    </div>

                    <div className="text-center flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="h-8 px-3 rounded-md bg-gf-border/40 text-gf-title text-xs inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                        disabled={loading}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        className="h-8 px-3 rounded-md bg-gf-danger text-white text-xs inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                        disabled={loading}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <ProductCreateModal
        open={openCreate}
        loading={loading}
        fLabel={fLabel}
        setFLabel={setFLabel}
        fCategory={fCategory}
        setFCategory={setFCategory}
        fWeight={fWeight}
        setFWeight={setFWeight}
        fActive={fActive}
        setFActive={setFActive}
        onClose={() => setOpenCreate(false)}
        onSubmit={onCreate}
      />

      <ProductEditModal
        open={openEdit}
        loading={loading}
        editId={editId}
        eLabel={eLabel}
        setELabel={setELabel}
        eCategory={eCategory}
        setECategory={setECategory}
        eWeight={eWeight}
        setEWeight={setEWeight}
        eActive={eActive}
        setEActive={setEActive}
        onClose={() => {
          setOpenEdit(false);
          setEditId(null);
        }}
        onSubmit={onSaveEdit}
      />
    </div>
  );
}
