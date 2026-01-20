/**
 * Liste "Activités récentes" (dashboard).
 */

/**
 * Affiche une liste courte d'activités (chaînes de texte).
 * @param {object} props
 * @param {string[]} [props.items]
 * @returns {import("react").JSX.Element}
 */
export default function ActivityList({ items = [] }) {
  return (
    <div className="gf-card p-4">
      <div className="text-xs font-medium text-gf-subtitle">Activités récentes</div>

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
