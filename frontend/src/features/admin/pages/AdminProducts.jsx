/**
 * Admin — Produits
 * - Liste + filtres (q, category, active)
 * - Création / édition / activation / suppression
 */
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
 * Page de gestion des produits (Admin).
 * @returns {import("react").JSX.Element}
 */
export default function AdminProducts() {
  // Filtres
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(""); // "" | "1" | "0"

  // Données
  const LIMIT = 50;

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [loadingMore, setLoadingMore] = useState(false);
  const [sentinelEl, setSentinelEl] = useState(null);

  const hasMore = rows.length < total;

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
   * Ouvre la modale d'édition et pré-remplit les champs.
   * @param {object} p Produit sélectionné
   * @returns {void}
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
 * Charge la première page (reset pagination) selon les filtres.
 * @returns {Promise<void>}
 */
  async function loadFirstPage() {
    try {
      setLoading(true);
      setError("");
      setOffset(0);

      const res = await listProducts({
        q: q.trim() || undefined,
        category: category || undefined,
        active: active !== "" ? active : undefined,
        limit: LIMIT,
        offset: 0,
      });

      setRows(res.data || []);
      setTotal(res.total ?? (res.count ?? 0));
      setCount(res.total ?? (res.count ?? 0));
    } catch (e) {
      setError(e.message || "Erreur chargement produits.");
      setRows([]);
      setTotal(0);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Charge la page suivante et concatène les résultats.
   * @returns {Promise<void>}
   */
  async function loadMore() {
    if (loading || loadingMore) return;
    if (!hasMore) return;

    try {
      setLoadingMore(true);
      setError("");

      const nextOffset = offset + LIMIT;

      const res = await listProducts({
        q: q.trim() || undefined,
        category: category || undefined,
        active: active !== "" ? active : undefined,
        limit: LIMIT,
        offset: nextOffset,
      });

      const next = res.data || [];
      setRows((prev) => [...prev, ...next]);
      setOffset(nextOffset);

      const t = res.total ?? total;
      setTotal(t);
      setCount(t);
    } catch (e) {
      setError(e.message || "Erreur chargement produits.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Rechargement automatique sur filtres (category/active)
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, active]);

  useEffect(() => {
    if (!sentinelEl) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "250px", threshold: 0 },
    );

    obs.observe(sentinelEl);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelEl, hasMore, offset, q, category, active, loading, loadingMore]);

  /**
   * Crée un produit puis recharge la liste.
   * @returns {Promise<void>}
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

      // Réinitialise le formulaire
      setOpenCreate(false);
      setFLabel("");
      setFCategory("AUTRE");
      setFWeight("");
      setFActive(true);

      await loadFirstPage();
    } catch (e) {
      setError(e.message || "Erreur création produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Enregistre les modifications d'un produit puis recharge la liste.
   * @returns {Promise<void>}
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
      await loadFirstPage();
    } catch (e) {
      setError(e.message || "Erreur modification produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Active/désactive un produit.
   * @param {object} p Produit
   * @returns {Promise<void>}
   */
  async function onToggleActive(p) {
    try {
      setLoading(true);
      setError("");
      await patchProduct(p.id, { is_active: p.is_active ? 0 : 1 });
      await loadFirstPage();
    } catch (e) {
      setError(e.message || "Erreur modification produit.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Supprime un produit (avec confirmation) puis recharge.
   * @param {object} p Produit
   * @returns {Promise<void>}
   */
  async function onDelete(p) {
    if (!confirm(`Supprimer le produit ?\n\n${p.pdf_label_exact}`)) return;

    try {
      setLoading(true);
      setError("");
      await deleteProduct(p.id);
      await loadFirstPage();
    } catch (e) {
      setError(e.message || "Erreur suppression produit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
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
            className="gf-btn gf-btn-primary h-9 px-4 text-xs rounded-md"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>

          <button
            type="button"
            onClick={loadFirstPage}
            disabled={loading}
            className="gf-btn h-9 px-3 text-xs rounded-md"
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
        onSubmit={loadFirstPage}
      />

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-gf-border bg-gf-surface overflow-hidden">
        {error ? (
          <div className="p-4 text-xs text-gf-danger">{error}</div>
        ) : null}

        {/* Header tableau */}
        <div className="bg-gf-bg text-gf-subtitle">
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
                    className="grid items-center px-4 py-3 gap-3 text-xs hover:bg-gf-orange/5"
                    style={{
                      gridTemplateColumns:
                        "minmax(420px,1fr) 140px 120px 120px 220px",
                    }}
                  >
                    <div className="truncate text-gf-title font-medium">
                      {p.pdf_label_exact}
                    </div>
                    <div className="text-center">{p.category || "—"}</div>
                    <div className="text-center">
                      {Number(p.weight_per_unit_kg ?? 0).toString()}
                    </div>

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

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="gf-btn h-8 px-3 text-xs rounded-md"
                        disabled={loading}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(p)}
                        className="gf-btn gf-btn-danger h-8 px-3 text-xs rounded-md"
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
              <div ref={setSentinelEl} className="h-8" />

              {loadingMore ? (
                <div className="p-4 text-xs text-gf-subtitle">Chargement…</div>
              ) : null}

              {!hasMore && rows.length > 0 ? (
                <div className="p-4 text-xs text-gf-subtitle">Fin de liste.</div>
              ) : null}

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
