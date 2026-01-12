/**
 * Card commande (Production mobile)
 * - Accordéon (collapse/expand)
 * - Lignes produits + stepper "Prêts"
 * - Actions : tout marquer prêt, production terminée (si complet)
 * - Commentaires repliables + enveloppe conditionnelle
 * - Clic enveloppe : ouvre card + ouvre commentaires + scroll
 */
import { useMemo, useRef, useState } from "react";
import { Mail, ChevronDown, ChevronUp, Plus } from "lucide-react";
import QtyStepper from "./QtyStepper.jsx";

function dotClassByStatus(status) {
  if (status === "COMPLETE") return "bg-green-500";
  if (status === "PARTIAL") return "bg-yellow-400";
  return "bg-gray-300";
}

function labelByStatus(status) {
  if (status === "COMPLETE") return "Prod.Complète";
  if (status === "PARTIAL") return "Prod.Partielle";
  return "Prod.À faire";
}

function priorityClass(priority) {
  if (priority === "URGENT") return "text-red-500";
  if (priority === "INTERMEDIAIRE") return "text-yellow-600";
  if (priority === "NORMAL") return "text-green-600";
  return "text-gf-muted";
}

function ProductionOrderCard({
  order,
  expanded,
  onToggle,
  readyByLineId,
  onChangeReady,
  onMarkAllReady,
  onFinishProduction,
  onAddComment,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const unreadCount = order.unreadCount ?? 0;
  const hasComments = (order.comments?.length ?? 0) > 0;

  const commentsRef = useRef(null);

  function openCardAndScrollToComments() {
    if (!expanded) onToggle();
    setCommentsOpen(true);

    requestAnimationFrame(() => {
      commentsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const groups = useMemo(() => order.groups ?? [], [order.groups]);

  const allReady = useMemo(() => {
    return groups.every((g) =>
      g.lines.every((l) => (readyByLineId[l.id] ?? 0) >= l.total)
    );
  }, [groups, readyByLineId]);

  return (
    <section className="rounded-2xl border border-gf-border bg-gf-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle();
        }}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm truncate">{order.company}</h2>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-2 text-xs text-gf-text">
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    dotClassByStatus(order.status),
                  ].join(" ")}
                />
                {labelByStatus(order.status)}
              </span>
            </div>
          </div>

          <div className="mt-1 text-xs text-gf-text">
            N° ARC <span className="text-gf-muted">{order.arc}</span>
          </div>

          <div className="mt-0.5 text-xs text-gf-muted flex items-center gap-2 flex-wrap">
            <span>Enlèvement : {order.pickupDate}</span>
            <span className={priorityClass(order.priority)}>
              - {order.priorityLabel}
            </span>
          </div>

          <div className="mt-0.5 text-xs text-gf-muted">{order.summary}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1">
          {hasComments ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCardAndScrollToComments();
              }}
              className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gf-orange/10"
              aria-label="Voir les commentaires"
            >
              <Mail className="h-5 w-5 text-gf-orange" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -left-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gf-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gf-muted" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Groupes produits */}
          {groups.map((group) => (
            <div
              key={group.name}
              className="rounded-xl border border-gf-border bg-gf-orange/10 p-3"
            >
              <div className="font-semibold text-sm">{group.name}</div>

              <div className="mt-2 space-y-3">
                {group.lines.map((line) => {
                  const value = readyByLineId[line.id] ?? 0;

                  return (
                    <div key={line.id} className="space-y-1">
                      <div className="text-[11px] text-gf-muted leading-snug">
                        ({line.code}) {line.label} {line.spec}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gf-text">
                          {line.weightKg} kg
                        </div>

                        <QtyStepper
                          value={value}
                          min={0}
                          max={line.total}
                          onChange={(next) => onChangeReady(line.id, next)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions */}
          <button
            type="button"
            onClick={onMarkAllReady}
            className="w-full h-10 rounded-xl border border-gf-orange text-gf-orange text-sm hover:bg-gf-orange/10"
          >
            Tout marquer prêt
          </button>

          {/* Commentaires repliables */}
          <div ref={commentsRef} className="pt-1">
            <button
              type="button"
              onClick={() => setCommentsOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2"
            >
              <div className="text-sm font-semibold">
                Commentaires ({order.comments.length})
              </div>

              {commentsOpen ? (
                <ChevronUp className="h-5 w-5 text-gf-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gf-muted" />
              )}
            </button>

            {commentsOpen && (
              <>
                <div className="mt-2 space-y-2">
                  {order.comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl bg-gray-600 text-white px-3 py-2 text-xs"
                    >
                      <div className="text-gf-orange font-semibold">
                        {c.author} - {c.at}
                      </div>
                      <div className="mt-0.5">{c.text}</div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={onAddComment}
                    className="h-9 w-11 rounded-lg border border-gf-orange text-gf-orange inline-flex items-center justify-center hover:bg-gf-orange/10"
                    aria-label="Ajouter un commentaire"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={!allReady}
            onClick={onFinishProduction}
            className={[
              "w-full h-11 rounded-xl text-sm font-medium",
              allReady
                ? "bg-gf-orange text-white hover:opacity-95"
                : "bg-gf-orange/40 text-white cursor-not-allowed",
            ].join(" ")}
          >
            Production terminée
          </button>
        </div>
      )}
    </section>
  );
}

export default ProductionOrderCard;