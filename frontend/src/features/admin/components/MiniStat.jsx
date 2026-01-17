export default function MiniStat({ title, value, subtitle }) {
  return (
    <div className="rounded-md border border-gf-border bg-gf-surface px-3 py-2">
      <div className="text-xs font-medium text-gf-title">{title}</div>
      <div className="mt-1 text-lg font-semibold text-gf-title">{value}</div>
      {subtitle ? (
        <div className="text-[11px] text-gf-subtitle whitespace-pre-line">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
