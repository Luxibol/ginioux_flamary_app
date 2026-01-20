/**
 * Production - Formatters & builders (labels, statuts, groupes).
 */
import { BIGBAG_MIN_KG, GROUP_ORDER } from "./productionOrders.constants.js";

/**
 * Libellé UI pour la priorité.
 * @param {string} p
 * @returns {string}
 */
export function priorityLabel(p) {
  if (p === "URGENT") return "Urgent";
  if (p === "INTERMEDIAIRE") return "Intermédiaire";
  if (p === "NORMAL") return "Normal";
  return "—";
}

/**
 * Map statut production backend -> clé UI.
 * @param {string} ps
 * @returns {"COMPLETE"|"PARTIAL"|"TODO"}
 */
export function statusFromProductionStatus(ps) {
  if (ps === "PROD_COMPLETE") return "COMPLETE";
  if (ps === "PROD_PARTIELLE") return "PARTIAL";
  return "TODO";
}

/**
 * Formate une date ISO (YYYY-MM-DD) en FR (DD/MM/YYYY).
 * @param {string} iso
 * @returns {string}
 */
export function formatDateFR(iso) {
  if (!iso) return "-/--/----";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return "-/--/----";
  return `${d}/${m}/${y}`;
}

/**
 * Convertit en nombre (fallback 0).
 * @param {unknown} v
 * @returns {number}
 */
export function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Extrait (code) + spec + label nettoyé depuis un libellé PDF.
 * @param {unknown} labelRaw
 * @returns {{ code: string, label: string, spec: string }}
 */
export function parseLabelParts(labelRaw) {
  const label = String(labelRaw ?? "").trim();

  const mCode = label.match(/^\(([^)]+)\)\s*(.*)$/);
  const code = mCode ? mCode[1].trim() : "";
  const rest = mCode ? mCode[2].trim() : label;

  const mSpec = rest.match(/(\d{1,3}\/\d{1,3})/);
  const spec = mSpec ? mSpec[1] : "";
  const cleanLabel = spec
    ? rest
        .replace(spec, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    : rest;

  return { code, label: cleanLabel, spec };
}

/**
 * Détermine le groupe UI d'une ligne (BigBag/SmallBag/Roche).
 * @param {unknown} categoryRaw
 * @param {unknown} weightKg
 * @returns {"BigBag"|"SmallBag"|"Roche"}
 */
export function groupNameFromLine(categoryRaw, weightKg) {
  const category = String(categoryRaw ?? "").toUpperCase();
  const w = Number(weightKg) || 0;

  if (category === "ROCHE") return "Roche";
  if (category === "BIGBAG") return w >= BIGBAG_MIN_KG ? "BigBag" : "SmallBag";
  return "Roche";
}

/**
 * Construit les groupes UI à partir des lignes API.
 * @param {any[]} lines
 * @returns {any[]}
 */
export function buildGroupsFromLines(lines) {
  const groupsMap = new Map();

  for (const l of lines) {
    const weightKg = asNumber(l.weight_per_unit_kg);
    const total = asNumber(l.quantity_ordered);
    const ready = asNumber(l.quantity_ready);

    const { code, label, spec } = parseLabelParts(l.label);
    const gName = groupNameFromLine(l.category, weightKg);

    if (!groupsMap.has(gName)) groupsMap.set(gName, { name: gName, lines: [] });

    groupsMap.get(gName).lines.push({
      id: l.id,
      code,
      label,
      spec,
      weightKg,
      total,
      _readyFromApi: ready,
    });
  }

  return Array.from(groupsMap.values()).sort(
    (a, b) => (GROUP_ORDER[a.name] ?? 99) - (GROUP_ORDER[b.name] ?? 99),
  );
}

/**
 * Construit le résumé d'une card à partir des groupes.
 * @param {any[]} groups
 * @returns {string}
 */
export function buildSummaryFromGroups(groups) {
  const counts = {};
  groups.forEach((g) => {
    counts[g.name] =
      (counts[g.name] ?? 0) + g.lines.reduce((s, l) => s + (l.total ?? 0), 0);
  });

  const parts = [];
  if (counts.BigBag) parts.push(`${counts.BigBag} BigBag`);
  if (counts.SmallBag) parts.push(`${counts.SmallBag} SmallBag`);
  if (counts.Roche) parts.push(`${counts.Roche} Roche`);
  return parts.length ? parts.join(" • ") : "—";
}
