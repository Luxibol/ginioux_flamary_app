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

module.exports = { asInt };
