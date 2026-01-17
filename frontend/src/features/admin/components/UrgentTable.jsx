import {
  formatDateFr,
  priorityClass,
  priorityLabel,
  formatOrderStateLabel,
} from "../utils/dashboard.format.js";

export default function UrgentTable({ rows, onView }) {
  return (
    <div className="rounded-2xl border border-gf-border bg-gf-surface overflow-hidden">
      {/* Header tableau */}
      <div className="bg-gf-bg text-gf-subtitle">
        <div className="p-3">
          <div
            className="grid items-center px-4 py-3 gap-3 font-medium justify-items-center text-xs"
            style={{ gridTemplateColumns: "110px 1fr 120px 120px 120px 1fr 180px" }}
          >
            <div>ARC</div>
            <div>Client</div>
            <div>Commande</div>
            <div>Enlèvement</div>
            <div>Priorité</div>
            <div>État</div>
            <div>Actions</div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="p-3 bg-gf-bg">
        {rows.length === 0 ? (
          <div className="p-4 text-xs text-gf-subtitle">Aucune commande urgente.</div>
        ) : (
          <div className="space-y-3 text-xs">
            {rows.map((o) => (
              <div
                key={o.id}
                className="rounded-xl bg-gf-surface overflow-hidden ring-1 ring-gf-border"
              >
                <div
                  className="grid items-center px-4 py-3 gap-3 hover:bg-gf-orange/5 justify-items-center"
                  style={{ gridTemplateColumns: "110px 1fr 120px 120px 120px 1fr 180px" }}
                >
                  <div className="font-medium text-gf-title">{o.arc}</div>
                  <div>{o.client_name ?? "—"}</div>
                  <div>{formatDateFr(o.order_date)}</div>
                  <div>{formatDateFr(o.pickup_date)}</div>

                  <div className={`font-medium ${priorityClass(o.priority)}`}>
                    {priorityLabel(o.priority)}
                  </div>

                  <div>{o.order_state_label || formatOrderStateLabel(o.state)}</div>

                  <div className="flex justify-center items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView?.(o)}
                      className="h-8 px-3 rounded-md bg-gf-orange text-white text-xs font-medium hover:opacity-90"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
