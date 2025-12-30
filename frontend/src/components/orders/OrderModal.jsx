import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Plus } from "lucide-react";

const PRIORITIES = ["NORMAL", "URGENT"]; // côté backend NORMAL/URGENT

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

export default function OrderModal({
  open,
  onClose,
  onConfirm,
  context = "import",
  data,      // preview backend: { arc, clientName, orderDate, products: [{pdfLabel, quantity}] }
  warning,
}) {
  const initialForm = useMemo(() => {
    return {
      clientName: data?.clientName ?? "",
      arc: data?.arc ?? "",
      orderDate: data?.orderDate ?? "", // ISO YYYY-MM-DD (backend)
      pickupDate: "", // pas encore géré par parsing, on laisse vide
      priority: "NORMAL",
      internalComment: "",
    };
  }, [data]);

  const [form, setForm] = useState(initialForm);

  // products backend: [{ pdfLabel, quantity }]
  const [products, setProducts] = useState(data?.products ?? []);

  useEffect(() => {
    setForm(initialForm);
    setProducts(data?.products ?? []);
  }, [initialForm, data]);

  if (!open) return null;

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const updateProduct = (idx, patch) => {
    setProducts((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeProduct = (idx) => setProducts((prev) => prev.filter((_, i) => i !== idx));

  const addProduct = () => {
    setProducts((prev) => [...prev, { pdfLabel: "", quantity: 1 }]);
  };

  const confirm = () => {
    onConfirm?.({
      preview: {
        arc: form.arc,
        clientName: form.clientName,
        orderDate: form.orderDate,
        products: products.map((p) => ({
          pdfLabel: p.pdfLabel ?? "",
          quantity: Number(p.quantity ?? 0),
        })),
        // NOTE: si plus tard ajout pickupDate/priority côté backend,
        // les inclure ici aussi.
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
              {form.arc ? `${form.arc} — ${form.clientName || "—"}` : "Commande"}
            </div>
            <div className="text-xs text-gf-subtitle">Vérifiez les informations avant validation.</div>
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
              <span className="font-medium text-gf-orange">Attention :</span> {warning}
            </div>
          ) : null}

          {/* Infos commande */}
          <div className="text-sm font-medium text-gf-title mb-2">Infos commande</div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <Input label="Client" value={form.clientName} onChange={setField("clientName")} placeholder="Client…" />
            </div>

            <div className="col-span-2">
              <Input label="N° ARC" value={form.arc} onChange={setField("arc")} placeholder="ARC…" />
            </div>

            <div className="col-span-2">
              <Input label="Date commande (ISO)" value={form.orderDate} onChange={setField("orderDate")} placeholder="YYYY-MM-DD" />
            </div>

            <div className="col-span-2">
              <Input label="Jour enlèvement" value={form.pickupDate} onChange={setField("pickupDate")} placeholder="YYYY-MM-DD" />
            </div>

            <div className="col-span-1">
              <Select label="Priorité" value={form.priority} onChange={setField("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Commentaire interne (uniquement import) */}
          {context === "import" ? (
            <div className="mt-4">
              <div className="text-xs text-gf-subtitle mb-1">Commentaire interne</div>
              <textarea
                className="w-full rounded-md border border-gf-border bg-gf-bg p-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                rows={3}
                value={form.internalComment}
                onChange={setField("internalComment")}
                placeholder="Commentaire interne (uniquement à l’import)…"
              />
            </div>
          ) : null}

          {/* Produits */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm font-medium text-gf-title">Lignes de produits</div>
            <button
              type="button"
              onClick={addProduct}
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
            {products.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <input
                    className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                    value={p.pdfLabel ?? ""}
                    onChange={(e) => updateProduct(idx, { pdfLabel: e.target.value })}
                    placeholder="Libellé PDF…"
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
                    value={p.quantity ?? 0}
                    onChange={(e) => updateProduct(idx, { quantity: e.target.value })}
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeProduct(idx)}
                    className="h-9 px-3 rounded-md bg-gf-danger text-white text-xs inline-flex items-center gap-2 hover:opacity-90"
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
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
