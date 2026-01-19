/**
 * Modale de commande utilisée dans 2 contextes :
 * - "import" : validation d'un import PDF (édition complète avant création en base)
 * - "orders" : édition d'une commande existante (envoi d'un PATCH)
 *
 * Rôle :
 * - Initialise un formulaire à partir de `data` (API / import)
 * - Permet d'ajouter / modifier / supprimer des lignes produits
 * - Construit le payload final en fonction du contexte
 */
import { useMemo, useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import ProductAutocompleteInput from "./ProductAutocompleteInput.jsx";
import { normalizeModalLines, normalizePriority, toISODate } from "../mappers/orderModal.mappers.js";

// Valeurs "backend" attendues pour la priorité (on garde l'ordre du moins au plus important).
const PRIORITIES = ["NORMAL", "INTERMEDIAIRE", "URGENT"];

/**
 * Champ input standardisé (label + styles).
 * But : éviter de répéter les classes Tailwind dans toute la modale.
 */
function Input({ label, ...props }) {
  return (
    <label className="block">
      <div className="text-xs text-gf-subtitle mb-1">{label}</div>
      <input
        {...props}
        className={[
          "h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text",
          "outline-none focus:border-gf-orange",
          props.className ?? "",
        ].join(" ")}
      />
    </label>
  );
}

/**
 * Select standardisé (label + styles).
 * Même objectif que <Input /> : cohérence UI et moins de duplication.
 */
function Select({ label, children, ...props }) {
  return (
    <label className="block">
      <div className="text-xs text-gf-subtitle mb-1">{label}</div>
      <select
        {...props}
        className={[
          "h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text",
          "outline-none focus:border-gf-orange",
          props.className ?? "",
        ].join(" ")}
      >
        {children}
      </select>
    </label>
  );
}

/**
 * @param {object} props
 * @param {boolean} props.open Ouvre/ferme la modale
 * @param {Function} props.onClose Callback fermeture
 * @param {Function} props.onConfirm Callback validation (payload différent selon `context`)
 * @param {"import"|"orders"} [props.context="import"] Contexte d'utilisation
 * @param {any} props.data Données source (import preview ou orderDetails mappé)
 * @param {string|null} props.warning Message d'avertissement (ex: dédoublonnage ARC)
 */
export default function OrderModal({
  open,
  onClose,
  onConfirm,
  context = "import",
  data,
  warning,
}) {
  // Initialise le formulaire à partir de `data` (import ou details commande).
  // On convertit les dates en ISO (YYYY-MM-DD) et on normalise la priorité.
  const initialForm = useMemo(() => {
    const arc = data?.arc ?? data?.orderRef ?? "";
    const orderDate = toISODate(data?.orderDate ?? data?.dateCommande ?? "");
    const pickupDate = toISODate(
      data?.pickupDate ?? data?.dateEnlevement ?? "",
    );
    const priority = normalizePriority(
      data?.priority ?? data?.priorite ?? "NORMAL",
    );

    return {
      clientName: data?.clientName ?? "",
      arc,
      orderDate,
      pickupDate,
      priority,
      internalComment: "",
    };
  }, [data]);

  // `form` : champs de commande (client/arc/dates/priorité/commentaire)
  // `lines` : lignes produits (libellé + productId + quantité)
  const [form, setForm] = useState(() => initialForm);
  const [lines, setLines] = useState(() => normalizeModalLines(data));

  if (!open) return null;

  const setField = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const updateLines = (idx, patch) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  };

  const removeLines = (idx) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const addLines = () => {
    setLines((prev) => [
      ...prev,
      { label: "", productId: null, weightKg: "", quantity: 1 },
    ]);
  };

  /**
   * Construit le payload de validation :
   * - "orders" : { order, lines } -> PATCH /orders/:id
   * - "import" : { preview, internalComment } -> POST /pdf/:importId/confirm
   *
   * On force les quantités en entiers (troncature) pour éviter NaN / décimales.
   */
  const confirm = () => {
    const linesClean = lines.map((l) => ({
      ...l,
      quantity: Number.isFinite(Number(l.quantity))
        ? Math.trunc(Number(l.quantity))
        : 0,
    }));

    if (context === "orders") {
      onConfirm?.({
        order: {
          arc: form.arc,
          clientName: form.clientName,
          orderDate: form.orderDate,
          pickupDate: form.pickupDate,
          priority: form.priority,
        },
        lines: linesClean,
      });
      return;
    }

    onConfirm?.({
      preview: {
        arc: form.arc,
        clientName: form.clientName,
        orderDate: form.orderDate,
        pickupDate: form.pickupDate,
        priority: form.priority,
        products: linesClean.map((l) => ({
          pdfLabel: l.label,
          quantity: l.quantity,
        })),
      },
      internalComment: form.internalComment,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl rounded-2xl bg-gf-surface border border-gf-border shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <div className="text-sm font-semibold text-gf-title">
              {form.arc
                ? `${form.arc} — ${form.clientName || "—"}`
                : "Commande"}
            </div>
            <div className="text-xs text-gf-subtitle">
              Vérifiez les informations avant validation.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-gf-bg"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {warning ? (
            <div className="mb-4 rounded-md border border-gf-border bg-gf-orange/10 p-3 text-xs text-gf-text">
              <span className="font-medium text-gf-orange">Attention :</span>{" "}
              {warning}
            </div>
          ) : null}

          <div className="text-sm font-medium text-gf-title mb-2">
            Infos commande
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <Input
                label="Client"
                value={form.clientName}
                onChange={setField("clientName")}
                placeholder="Client…"
              />
            </div>

            <div className="col-span-2">
              <Input
                label="N° ARC"
                value={form.arc}
                onChange={setField("arc")}
                placeholder="ARC…"
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Date commande (ISO)"
                type="date"
                value={form.orderDate}
                onChange={setField("orderDate")}
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Jour enlèvement"
                value={form.pickupDate}
                type="date"
                onChange={setField("pickupDate")}
              />
            </div>

            <div className="col-span-1">
              <Select
                label="Priorité"
                value={form.priority}
                onChange={setField("priority")}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {context === "import" ? (
            <div className="mt-4">
              <div className="text-xs text-gf-subtitle mb-1">
                Commentaire interne
              </div>
              <textarea
                className="w-full rounded-md border border-gf-border bg-gf-bg p-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                rows={3}
                value={form.internalComment}
                onChange={setField("internalComment")}
                placeholder="Commentaire interne (uniquement à l’import)…"
              />
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm font-medium text-gf-title">
              Lignes de produits
            </div>
            <button
              type="button"
              onClick={addLines}
              className="inline-flex items-center gap-2 text-xs text-gf-orange hover:underline"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Ajouter une ligne
            </button>
          </div>

          <div className="mt-3 grid grid-cols-12 gap-3 text-xs text-gf-subtitle">
            <div className="col-span-8">Libellé PDF exact</div>
            <div className="col-span-2">Quantité</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="mt-2 space-y-2">
            {lines.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <ProductAutocompleteInput
                    value={p.label ?? ""}
                    onChangeText={(txt) =>
                      updateLines(idx, { label: txt, productId: null })
                    }
                    onPick={(prod) =>
                      updateLines(idx, {
                        productId: prod.id,
                        label: prod.pdf_label_exact,
                      })
                    }
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                    value={p.quantity ?? 0}
                    onChange={(e) =>
                      updateLines(idx, { quantity: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLines(idx)}
                    className="h-9 px-3 rounded-md bg-gf-danger text-white text-xs inline-flex items-center gap-2 hover:opacity-90"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-gf-border bg-gf-bg px-5 text-xs hover:opacity-90"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirm}
              className="h-9 rounded-md bg-gf-orange px-6 text-xs font-medium text-white hover:opacity-90"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
