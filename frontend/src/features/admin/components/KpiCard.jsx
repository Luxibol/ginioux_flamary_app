/**
 * KPI Card (dashboard) : titre + valeur + lignes de détail.
 */

/**
 * Carte KPI utilisée sur les dashboards.
 * @param {object} props
 * @param {string} props.title
 * @param {string|number} props.value
 * @param {Array<string|number>} [props.lines]
 * @returns {import("react").JSX.Element}
 */
export default function KpiCard({ title, value, lines = [] }) {
  return (
    <div className="w-full max-w-[260px] rounded-2xl border border-gf-border bg-gf-bg px-4 py-4 text-center">
      <div className="text-xs font-medium text-gf-subtitle">{title}</div>

      <div className="mt-1 text-[26px] leading-none font-semibold text-gf-title">
        {value}
      </div>

      <div className="mt-2 space-y-0.5">
        {lines.map((t, i) => {
          const s = String(t ?? "");
          const isTotals = s.includes("BigBag");
          const isUrgentLine = s.includes("urgentes");

          const cls = isTotals
            ? "text-xs text-gf-orange font-medium"
            : isUrgentLine
              ? "text-xs text-gf-danger font-medium"
              : "text-xs text-gf-subtitle";

          return (
            <div key={i} className={cls}>
              {t}
            </div>
          );
        })}
      </div>
    </div>
  );
}
