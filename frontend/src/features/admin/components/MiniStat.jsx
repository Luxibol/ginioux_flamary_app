/**
 * Mini statistique (dashboard) : titre + valeur + sous-titre optionnel.
 */

/**
 * Carte "mini stat" utilisée sur les dashboards.
 * @param {object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {string} [props.subtitle]
 * @returns {import("react").JSX.Element}
 */
export default function MiniStat({ title, value, subtitle }) {
  const isTotals = typeof subtitle === "string" && subtitle.includes("BigBag");

  return (
    <div className="gf-card p-3">
      <div className="text-xs font-medium text-gf-subtitle">{title}</div>
      <div className="mt-1 text-lg font-semibold text-gf-title">{value}</div>

      {subtitle ? (
        <div
          className={[
            "mt-1 text-[11px] whitespace-pre-line",
            isTotals ? "text-gf-orange font-medium" : "text-gf-subtitle",
          ].join(" ")}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
