export default function BureauKpiCard({ title, value, lines = [], dot = false }) {
  return (
    <div className="w-full max-w-[240px] gf-card gf-card-pad text-center">
      <div className="text-xs font-medium text-gf-title">{title}</div>

      <div className="mt-2 text-2xl font-semibold text-gf-title">{value}</div>

      {lines.map((t, i) => (
        <div
          key={i}
          className="mt-1 flex items-center justify-center gap-2 text-xs text-gf-subtitle"
        >
          {dot ? <span className="h-2 w-2 rounded-full bg-gf-danger" /> : null}
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}
