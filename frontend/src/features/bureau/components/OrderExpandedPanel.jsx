/**
 * Bureau - Order Expanded Panel
 * - Détails commande + expéditions déjà effectuées (lazy-load)
 * - Thread commentaires
 */
import { toNumber } from "../utils/orders.format.js";
import { useEffect, useState } from "react";
import { getOrderShipments } from "../../../services/orders.api.js";
import OrderCommentsThread from "../../../components/comments/OrderCommentsThread.jsx";

/**
 * Panneau de détails d'une commande (accordéon).
 * @param {{
 *  arc: string,
 *  expeditionStatus: string,
 *  details: any,
 *  onCountsChange: (orderId: number, counts: { messagesCount?: number, unreadCount?: number }) => void,
 *  commentsOpen?: boolean,
 *  onCommentsOpenChange?: (open: boolean) => void
 * }} props
 * @returns {import("react").JSX.Element}
 */
export default function OrderExpandedPanel({
  arc,
  expeditionStatus,
  details,
  onCountsChange,
  commentsOpen = false,
  onCommentsOpenChange,
}) {
  const lines = details?.lines || [];
  const orderId = details?.order?.id;

  const [shipments, setShipments] = useState([]);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState("");

  /**
   * Charge les expéditions déjà effectuées quand la commande est (partiellement) expédiée.
   * @returns {void}
   */
  useEffect(() => {
    if (!orderId) return;
    if (expeditionStatus === "NON_EXPEDIEE") return;

    let cancelled = false;

    (async () => {
      try {
        setShipLoading(true);
        setShipError("");
        const res = await getOrderShipments(orderId);
        if (!cancelled) setShipments(res.shipments || []);
      } catch (e) {
        if (!cancelled)
          setShipError(e.message || "Erreur chargement expéditions.");
      } finally {
        if (!cancelled) setShipLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, expeditionStatus]);

  return (
    <div className="px-4 py-4">
      <div className="gf-h3 mb-3">Détails de la commande {arc}</div>

      <div className="space-y-1 text-xs text-gf-text">
        {lines.length === 0 ? (
          <div className="gf-empty">Aucune ligne produit.</div>
        ) : (
          lines.map((l) => {
            const ready = toNumber(l.quantity_ready);
            const ordered = toNumber(l.quantity_ordered);
            const w = l.weight_per_unit_kg
              ? `${toNumber(l.weight_per_unit_kg)} kg`
              : "—";

            return (
              <div key={l.id} className="flex items-baseline gap-2">
                <span className="font-semibold">
                  {ready} / {ordered} prêts
                </span>
                <span className="text-gf-subtitle">- {w} -</span>
                <span className="truncate">{l.label}</span>
              </div>
            );
          })
        )}
      </div>

      {expeditionStatus === "EXP_PARTIELLE" ? (
        <div className="mt-5">
          <div className="gf-h3 mb-2">Expéditions déjà effectuées</div>

          {shipLoading ? (
            <div className="gf-empty">Chargement…</div>
          ) : shipError ? (
            <div className="gf-error">{shipError}</div>
          ) : shipments.length === 0 ? (
            <div className="gf-empty">Aucune expédition enregistrée.</div>
          ) : (
            <div className="space-y-3 text-xs">
              {shipments.map((s, idx) => (
                <div
                  key={s.id}
                  className="rounded-md border border-gf-border bg-gf-bg p-3"
                >
                  <div className="text-gf-subtitle font-medium mb-2">
                    Expédition {idx + 1} —{" "}
                    {new Date(s.departed_at).toLocaleString("fr-FR")}
                  </div>

                  <div className="space-y-1 text-gf-text">
                    {s.lines.map((l, i) => (
                      <div
                        key={`${s.id}-${l.product_id}-${i}`}
                        className="flex gap-2"
                      >
                        <span className="font-semibold">
                          {l.quantity_loaded}
                        </span>
                        <span className="truncate">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5">
        <OrderCommentsThread
          orderId={orderId}
          open={true}
          onCountsChange={onCountsChange}
          collapsed={!commentsOpen}
          onCollapsedChange={(isCollapsed) =>
            onCommentsOpenChange?.(!isCollapsed)
          }
        />
      </div>
    </div>
  );
}
