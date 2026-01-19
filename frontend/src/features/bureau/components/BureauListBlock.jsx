import { Link } from "react-router-dom";

export default function BureauListBlock({ title, items = [], linkTo, linkLabel }) {
  return (
    <div className="w-full">
      <div className="text-xs font-medium text-gf-title">{title}</div>

      <div className="mt-2 space-y-1 text-[11px] text-gf-subtitle">
        {items.length === 0 ? (
          <div>Aucun élément.</div>
        ) : (
          items.map((t, i) => (
            <div key={i} className="leading-snug">
              {t}
            </div>
          ))
        )}
      </div>

      {linkTo ? (
        <div className="mt-2">
          <Link to={linkTo} className="text-xs font-medium text-gf-orange">
            {linkLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
