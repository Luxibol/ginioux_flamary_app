/**
 * Stepper quantité (mobile)
 * - +/- avec bornes min/max
 * - clic sur la valeur => saisie directe (input) pour aller vite (ex: 20)
 */
import { useEffect, useMemo, useRef, useState } from "react";

function clampInt(n, min, max) {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export default function QtyStepper({
  label = "Prêts",
  value = 0,
  min = 0,
  max = 0,
  onChange,
  disabled = false,

  allowDirect = true,
}) {
  const v = useMemo(() => (Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0), [value]);
  const minV = useMemo(() => (Number.isFinite(Number(min)) ? Math.trunc(Number(min)) : 0), [min]);
  const maxV = useMemo(() => (Number.isFinite(Number(max)) ? Math.trunc(Number(max)) : 0), [max]);

  const decDisabled = disabled || v <= minV;
  const incDisabled = disabled || v >= maxV;

  const emit = (next) => {
    if (disabled) return;
    if (typeof onChange === "function") onChange(next);
  };

  // édition directe
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(v));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      // focus + select
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const commit = () => {
    const next = clampInt(draft, minV, maxV);
    setEditing(false);
    setDraft(String(next));
    if (next !== v) emit(next);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(v));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gf-text whitespace-nowrap">{label} :</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => emit(Math.max(minV, v - 1))}
          disabled={decDisabled}
          className={[
            "h-8 w-8 rounded-md border border-gf-border text-sm",
            "inline-flex items-center justify-center bg-gf-surface",
            decDisabled ? "opacity-40" : "hover:bg-gf-orange/10",
          ].join(" ")}
          aria-label={`${label} - diminuer`}
        >
          -
        </button>

        {/* Valeur */}
        {allowDirect && !disabled ? (
          editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              inputMode="numeric"
              className="h-8 w-14 rounded-md border border-gf-border bg-white text-center text-sm outline-none focus:border-gf-orange"
              aria-label={`${label} - saisir une valeur`}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(String(v));
                setEditing(true);
              }}
              className="h-8 w-14 rounded-md border border-gf-border bg-white text-sm inline-flex items-center justify-center hover:bg-gf-orange/10"
              title="Cliquer pour saisir une valeur"
              aria-label={`${label} - valeur (cliquer pour saisir)`}
            >
              {v}
            </button>
          )
        ) : (
          <div className="h-8 w-14 rounded-md border border-gf-border text-sm inline-flex items-center justify-center bg-white">
            {v}
          </div>
        )}

        <button
          type="button"
          onClick={() => emit(Math.min(maxV, v + 1))}
          disabled={incDisabled}
          className={[
            "h-8 w-8 rounded-md border border-gf-border text-sm",
            "inline-flex items-center justify-center bg-gf-surface",
            incDisabled ? "opacity-40" : "hover:bg-gf-orange/10",
          ].join(" ")}
          aria-label={`${label} - augmenter`}
        >
          +
        </button>
      </div>

      <span className="text-xs text-gf-text whitespace-nowrap">/ {maxV}</span>
    </div>
  );
}
