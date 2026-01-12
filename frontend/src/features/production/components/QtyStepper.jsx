/**
 * Stepper quantité (mobile)
 * - min/max
 * - callbacks simples
 */
function QtyStepper({ value, min = 0, max = 0, onChange }) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gf-text whitespace-nowrap">Prêts :</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={decDisabled}
          className={[
            "h-6 w-6 rounded border border-gf-border text-xs",
            "inline-flex items-center justify-center",
            decDisabled ? "opacity-40" : "hover:bg-gf-orange/10",
          ].join(" ")}
          aria-label="Diminuer"
        >
          -
        </button>

        <div className="h-6 min-w-6 px-2 rounded border border-gf-border text-xs inline-flex items-center justify-center bg-white">
          {value}
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={incDisabled}
          className={[
            "h-6 w-6 rounded border border-gf-border text-xs",
            "inline-flex items-center justify-center",
            incDisabled ? "opacity-40" : "hover:bg-gf-orange/10",
          ].join(" ")}
          aria-label="Augmenter"
        >
          +
        </button>
      </div>

      <span className="text-xs text-gf-text whitespace-nowrap">/ {max}</span>
    </div>
  );
}

export default QtyStepper;
