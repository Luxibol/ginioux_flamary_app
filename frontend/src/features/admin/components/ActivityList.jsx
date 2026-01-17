export default function ActivityList({ items }) {
  return (
    <div className="rounded-md border border-gf-border bg-gf-surface p-3">
      <div className="text-xs font-medium text-gf-title">Activités récentes</div>
      <div className="mt-2 space-y-2 text-xs text-gf-subtitle">
        {items.length === 0 ? (
          <div>Aucune activité récente.</div>
        ) : (
          items.map((t, i) => (
            <div key={i} className="leading-snug">
              {t}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
