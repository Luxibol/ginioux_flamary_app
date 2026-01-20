/**
 * Champ d'autocomplétion produit (libellé PDF).
 * - Déclenche une recherche API avec debounce (250ms)
 * - Annule la requête précédente via AbortController
 * - Affiche une liste déroulante cliquable sans perdre le focus (onMouseDown)
 */
import { useEffect, useRef, useState } from "react";
import { searchProducts } from "../../../services/products.api";

/**
 * Hook utilitaire : renvoie une version "debounced" d'une valeur.
 * Utile pour éviter de déclencher une recherche à chaque frappe.
 * @param {any} value
 * @param {number} delay
 * @returns {any}
 */
function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Input d'autocomplétion basé sur une recherche produit côté API.
 * @param {object} props
 * @param {string} props.value
 * @param {(product: any) => void} props.onPick
 * @param {(text: string) => void} props.onChangeText
 * @returns {import("react").JSX.Element}
 */
export default function ProductAutocompleteInput({
  value,
  onPick,
  onChangeText,
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const debounced = useDebouncedValue(value, 250);
  const blurTimerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const q = (debounced || "").trim();

    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      setErrorMsg("");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setErrorMsg("");

    (async () => {
      try {
        const res = await searchProducts(q, 10, { signal: ctrl.signal });
        setItems(Array.isArray(res) ? res : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setItems([]);
          setErrorMsg(e?.message || "Erreur recherche");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [debounced]);

  const qNow = (value || "").trim();
  const show = open && qNow.length >= 2;

  return (
    <div className="relative">
      <input
        className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs text-gf-text outline-none focus:border-gf-orange"
        value={value ?? ""}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // delay to allow click
          blurTimerRef.current = setTimeout(() => setOpen(false), 120);
        }}
        onChange={(e) => {
          onChangeText(e.target.value);
          setOpen(true);
        }}
        placeholder="Libellé PDF…"
      />

      {show ? (
        <div className="absolute z-50 mt-1 w-full gf-card shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-3 py-2 gf-empty">Recherche…</div>
          ) : errorMsg ? (
            <div className="px-3 py-2 gf-error">{errorMsg}</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 gf-empty">Aucun résultat</div>
          ) : (
            items.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gf-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-orange/50"
                onMouseDown={(e) => {
                  // keep focus on select
                  e.preventDefault();
                  if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                  onPick(p);
                  setOpen(false);
                }}
              >
                <div className="text-gf-title font-medium truncate">
                  {p.pdf_label_exact}
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
