export default function ActivityList({ items = [] }) {
  return (
    <div className="gf-card px-4 py-4">
      <div className="text-xs font-medium text-gf-title">Activités récentes</div>

      <div className="mt-2 space-y-1 text-[11px] text-gf-subtitle">
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
