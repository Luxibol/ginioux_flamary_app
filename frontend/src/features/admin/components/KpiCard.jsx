export default function KpiCard({ title, value, lines = [] }) {
  return (
    <div className="w-full max-w-[240px] rounded-md border border-gf-border bg-gf-bg px-4 py-3 text-center">
      <div className="text-xs font-medium text-gf-title">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gf-title">{value}</div>

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
  );
}
