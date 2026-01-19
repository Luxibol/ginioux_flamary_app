export default function MiniStat({ title, value, subtitle }) {
  const isTotals = typeof subtitle === "string" && subtitle.includes("BigBag");

  return (
    <div className="gf-card px-3 py-3">
      <div className="text-xs font-medium text-gf-title">{title}</div>
      <div className="mt-1 text-lg font-semibold text-gf-title">{value}</div>

      {subtitle ? (
        <div
          className={[
            "mt-1 text-[11px] whitespace-pre-line",
            isTotals ? "text-gf-orange font-medium" : "text-gf-subtitle",
          ].join(" ")}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
