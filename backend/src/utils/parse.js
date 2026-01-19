// backend/src/utils/parse.js

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

module.exports = { asInt };
