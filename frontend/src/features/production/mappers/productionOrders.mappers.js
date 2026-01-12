/**
 * Mappers Production :
 * - mapProductionOrdersList : normalise la liste /orders/production pour l'UI
 * - mapOrderDetailsToGroups : transforme les lignes en groupes + résumé
 */
import {
  formatDateFR,
  priorityLabel,
  statusFromProductionStatus,
  buildGroupsFromLines,
  buildSummaryFromGroups,
} from "../utils/productionOrders.format.js";

export function mapProductionOrdersList(apiData) {
  const data = Array.isArray(apiData) ? apiData : [];

  return data.map((o) => ({
    id: o.id,
    company: o.client_name ?? "—",
    arc: o.arc ?? "—",
    pickupDate: formatDateFR(o.pickup_date),
    priority: o.priority ?? "NORMAL",
    priorityLabel: priorityLabel(o.priority),
    status: statusFromProductionStatus(o.production_status),
    groups: [],
    comments: [],
    summary: "—",
  }));
}

export function mapOrderDetailsToGroups(lines) {
  const groups = buildGroupsFromLines(lines);
  const summary = buildSummaryFromGroups(groups);
  return { groups, summary };
}
