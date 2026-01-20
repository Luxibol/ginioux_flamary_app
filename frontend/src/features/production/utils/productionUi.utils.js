/**
 * Production - Utils (concurrency, bornes steppers, statuts expéditions).
 */
import { asNumber } from "./productionOrders.format.js";

/**
 * Exécute une liste de "task factories" avec une concurrence limitée.
 * @param {Array<() => Promise<unknown>>} tasks
 * @param {number} [concurrency=5]
 * @returns {Promise<{ results: unknown[], errors: Array<{ index: number, error: unknown }> }>}
 */
export async function runWithConcurrency(tasks, concurrency = 5) {
  const list = Array.isArray(tasks) ? tasks : [];
  const limit = Math.max(1, Math.trunc(concurrency));

  const results = new Array(list.length);
  const errors = [];

  let idx = 0;

  async function worker() {
    while (idx < list.length) {
      const i = idx++;
      const task = list[i];

      if (typeof task !== "function") {
        errors.push({
          index: i,
          error: new Error("Task invalide (function attendue)"),
        });
        continue;
      }

      try {
        results[i] = await task();
      } catch (e) {
        errors.push({ index: i, error: e });
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, list.length) }, worker);
  await Promise.all(workers);

  return { results, errors };
}

/**
 * Construit un Map lineId -> min (borne basse du stepper).
 * Règle : min = shipped (empêche de descendre sous déjà expédié).
 * @param {any[]} lines
 * @returns {Map<number, number>}
 */
export function buildMinByIdFromLines(lines) {
  const list = Array.isArray(lines) ? lines : [];
  return new Map(
    list.map((l) => [
      l.id,
      Math.max(0, Math.trunc(asNumber(l.quantity_shipped))),
    ]),
  );
}

/**
 * Construit un Map lineId -> max (borne haute du stepper "Chargés").
 * Règle : max = max(0, ready - shipped).
 * @param {any[]} lines
 * @returns {Map<number, number>}
 */
export function buildMaxLoadableByIdFromLines(lines) {
  const list = Array.isArray(lines) ? lines : [];
  return new Map(
    list.map((l) => {
      const ready = asNumber(l.quantity_ready);
      const shipped = asNumber(l.quantity_shipped);
      return [l.id, Math.max(0, Math.trunc(ready - shipped))];
    }),
  );
}

/**
 * Injecte des bornes min/max dans les lignes déjà mappées (groups -> lines).
 * @param {Array<{lines:Array<{id:number, total:number}>}>} groups
 * @param {{minById?:Map<number,number>, maxById?:Map<number,number>}} [opts]
 * @returns {any[]}
 */
export function injectMinMaxIntoGroups(groups, { minById, maxById } = {}) {
  const g = Array.isArray(groups) ? groups : [];
  return g.map((grp) => ({
    ...grp,
    lines: grp.lines.map((ln) => {
      const next = { ...ln };
      if (minById) next.min = minById.get(ln.id) ?? 0;
      if (maxById) next.max = maxById.get(ln.id) ?? ln.total;
      return next;
    }),
  }));
}

/**
 * Calcule le "UI status" shipments depuis les lignes API (vérité BDD).
 * @param {any[]} lines
 * @returns {{loadedTotal:number, chargeableTotal:number, status:"TODO"|"PARTIAL"|"COMPLETE", label:string}}
 */
export function computeShipmentUiFromLines(lines) {
  const list = Array.isArray(lines) ? lines : [];

  const loadedTotal = list.reduce(
    (acc, l) => acc + asNumber(l.quantity_loaded),
    0,
  );

  const chargeableTotal = list.reduce((acc, l) => {
    const ready = asNumber(l.quantity_ready);
    const shipped = asNumber(l.quantity_shipped);
    return acc + Math.max(0, Math.trunc(ready - shipped));
  }, 0);

  return computeShipmentUiFromTotals(loadedTotal, chargeableTotal);
}

/**
 * Calcule status/label shipments à partir des totaux.
 * @param {number} loadedTotal
 * @param {number} chargeableTotal
 * @returns {{loadedTotal:number, chargeableTotal:number, status:"TODO"|"PARTIAL"|"COMPLETE", label:string}}
 */
export function computeShipmentUiFromTotals(loadedTotal, chargeableTotal) {
  const loaded = Number(loadedTotal ?? 0);
  const chargeable = Number(chargeableTotal ?? 0);

  const status =
    loaded <= 0
      ? "TODO"
      : chargeable > 0 && loaded >= chargeable
        ? "COMPLETE"
        : "PARTIAL";

  const label =
    status === "COMPLETE"
      ? "Chargement complet"
      : status === "PARTIAL"
        ? "Chargement partiel"
        : "À charger";

  return { loadedTotal: loaded, chargeableTotal: chargeable, status, label };
}
