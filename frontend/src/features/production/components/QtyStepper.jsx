/**
 * Stepper quantité (mobile)
 * - Affiche une valeur entière avec bornes min/max
 * - Déclenche onChange(nextValue) au clic
 */
function QtyStepper({ label = "Prêts", value = 0, min = 0, max = 0, onChange }) {
  const v = Number(value) || 0;
  const minV = Number(min) || 0;
  const maxV = Number(max) || 0;

  const decDisabled = v <= minV;
  const incDisabled = v >= maxV;

  const emit = (next) => {
    if (typeof onChange === "function") onChange(next);
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
            "h-6 w-6 rounded border border-gf-border text-xs",
            "inline-flex items-center justify-center",
            decDisabled ? "opacity-40" : "hover:bg-gf-orange/10",
          ].join(" ")}
          aria-label={`${label} - diminuer`}
        >
          -
        </button>

        <div className="h-6 min-w-6 px-2 rounded border border-gf-border text-xs inline-flex items-center justify-center bg-white">
          {v}
        </div>

        <button
          type="button"
          onClick={() => emit(Math.min(maxV, v + 1))}
          disabled={incDisabled}
          className={[
            "h-6 w-6 rounded border border-gf-border text-xs",
            "inline-flex items-center justify-center",
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

export default QtyStepper;
