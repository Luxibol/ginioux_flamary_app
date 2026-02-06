/**
 * @file backend/src/utils/parse.js
 * @description Helpers de parsing (cast safe).
 */

/**
 * Cast en entier (retourne null si NaN/inf).
 * @param {unknown} v
 * @returns {number|null}
 */
function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/**
 * Quantité "métier" : entier >= 0.
 * - Accepte "3", "3,00", "3.00"
 * - Refuse "3,49" / "3.5" / "abc"
 * @param {unknown} v
 * @returns {number|null}
 */
function asNonNegativeIntFrStrict(v) {
  if (v === null || v === undefined || v === "") return null;

  const s = String(v).trim().replace(",", ".");
  if (!/^\d+(?:\.00)?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const i = Math.trunc(n);
  return i >= 0 ? i : null;
}

module.exports = { asInt, asNonNegativeIntFrStrict };
