export default function KpiCard({ title, value, lines = [] }) {
  return (
    <div className="w-full max-w-[240px] rounded-md border border-gf-border bg-gf-bg px-4 py-3 text-center">
      <div className="text-xs font-medium text-gf-title">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gf-title">{value}</div>
      {lines.map((t, i) => (
        <div key={i} className="text-xs text-gf-subtitle">
          {t}
        </div>
      ))}
    </div>
  );
}
