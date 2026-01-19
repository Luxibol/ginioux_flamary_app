/**
 * Card commande (Production mobile)
 * - Accordéon (collapse/expand)
 * - Lignes produits + stepper "Chargés"
 * - Actions : tout charger, départ camion, etc.
 * - Commentaires contrôlés (parent) + enveloppe stable
 */
import { useMemo, useRef, useState } from "react";
import { Mail, ChevronDown, ChevronUp } from "lucide-react";
import QtyStepper from "./QtyStepper.jsx";
import OrderCommentsThread from "../../../components/comments/OrderCommentsThread.jsx";

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

export default function ProductionOrderCard({
  order,
  expanded,
  onToggle,

  readyByLineId,
  onChangeReady,
  onMarkAllReady,

  onCountsChange,

  statusLabelOverride = null,
  statusKeyOverride = null,

  // optionnels UI
  stepperLabel = "Prêts",
  markAllLabel = "Tout marquer prêt",
  markAllDisabled = false,
  primaryLabel = "Production terminée",
  primaryDisabled = null,
  onPrimaryAction = null,

  // NEW (contrôle depuis Shipment.jsx)
  commentsOpen: commentsOpenProp,
  onCommentsOpenChange,
}) {
  // contrôlé (si fourni), sinon local
  const [commentsOpenLocal, setCommentsOpenLocal] = useState(false);
  const commentsOpen =
    typeof commentsOpenProp === "boolean" ? commentsOpenProp : commentsOpenLocal;

  const setCommentsOpen = (v) => {
    const next = Boolean(v);
    if (typeof commentsOpenProp === "boolean") {
      onCommentsOpenChange?.(next);
    } else {
      setCommentsOpenLocal(next);
      onCommentsOpenChange?.(next);
    }
  };

  const unreadCount = Number(order?.unreadCount ?? 0);
  const messagesCount = Number(order?.messagesCount ?? 0);
  const hasComments = messagesCount > 0;

  const commentsRef = useRef(null);

  function openCardAndScrollToComments() {
    if (!expanded) onToggle?.();
    setCommentsOpen(true);

    requestAnimationFrame(() => {
      commentsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const groups = useMemo(() => order?.groups ?? [], [order?.groups]);
  const statusKey = statusKeyOverride ?? order?.status;

  const allReady = useMemo(() => {
    return groups.every((g) =>
      g.lines.every((l) => (readyByLineId?.[l.id] ?? 0) >= l.total)
    );
  }, [groups, readyByLineId]);

  const effectivePrimaryDisabled =
    primaryDisabled !== null ? primaryDisabled : !allReady;

  const effectivePrimaryAction = onPrimaryAction;

  return (
    <section className="rounded-2xl border border-gf-border bg-gf-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter") onToggle?.();
          if (e.key === " ") {
            e.preventDefault();
            onToggle?.();
          }
        }}
        className="relative w-full text-left px-4 py-3 pr-14 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm truncate">{order?.company}</h2>

            <span className="inline-flex items-center gap-2 text-xs text-gf-text shrink-0">
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  dotClassByStatus(statusKey),
                ].join(" ")}
              />
              {statusLabelOverride ?? labelByStatus(statusKey)}
            </span>
          </div>

          <div className="mt-1 text-xs text-gf-text">
            N° ARC <span className="text-gf-muted">{order?.arc}</span>
          </div>

          <div className="mt-0.5 text-xs text-gf-muted flex items-center gap-2 flex-wrap">
            <span>Enlèvement : {order?.pickupDate ?? "—"}</span>
            <span className={priorityClass(order?.priority)}>
              - {order?.priorityLabel}
            </span>
          </div>

          <div className="mt-0.5 text-xs text-gf-muted">{order?.summary}</div>
        </div>

        {/* Chevron (haut droite) */}
          <div className="absolute top-3 right-3">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gf-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gf-muted" />
            )}
          </div>

          {/* Enveloppe (bas droite) */}
          <div className="absolute bottom-3 right-3">
            <div className="relative h-9 w-9 grid place-items-center">
              {hasComments ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCardAndScrollToComments();
                  }}
                  className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-gf-orange/10"
                  aria-label="Voir les commentaires"
                  title="Messages"
                >
                  <Mail className="h-5 w-5 text-gf-orange" />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -left-1 h-5 min-w-5 px-1 rounded-full bg-gf-orange text-white text-[10px] grid place-items-center">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              ) : (
                // place réservée (invisible)
                <span className="pointer-events-none opacity-0">
                  <Mail className="h-5 w-5" />
                </span>
              )}
            </div>
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
                  const value = readyByLineId?.[line.id] ?? 0;

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
                          label={stepperLabel}
                          value={value}
                          min={line.min ?? 0}
                          max={line.max ?? line.total}
                          onChange={(next) => onChangeReady?.(line.id, next)}
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
            disabled={markAllDisabled}
            className={[
              "w-full h-10 rounded-xl border text-sm",
              !markAllDisabled
                ? "border-gf-orange text-gf-orange hover:bg-gf-orange/10"
                : "border-gf-orange/40 text-gf-orange/40 cursor-not-allowed",
            ].join(" ")}
          >
            {markAllLabel}
          </button>

          {/* ✅ Commentaires : UN SEUL header (celui du thread) */}
          <div ref={commentsRef} className="pt-1">
            <OrderCommentsThread
              orderId={order?.id}
              open={true}
              onCountsChange={onCountsChange}
              // contrôle ouverture depuis parent/enveloppe
              collapsed={!commentsOpen}
              onCollapsedChange={(isCollapsed) => setCommentsOpen(!isCollapsed)}
              // IMPORTANT: on garde le header du thread, donc pas de header custom ici
              showHeader={true}
            />
          </div>

          <button
            type="button"
            disabled={effectivePrimaryDisabled}
            onClick={effectivePrimaryAction}
            className={[
              "w-full h-11 rounded-xl text-sm font-medium",
              !effectivePrimaryDisabled
                ? "bg-gf-orange text-white hover:opacity-95"
                : "bg-gf-orange/40 text-white cursor-not-allowed",
            ].join(" ")}
          >
            {primaryLabel}
          </button>
        </div>
      )}
    </section>
  );
}
