/**
 * Utils — Admin produits : catégories + helpers de parsing.
 */

/** Options UI : catégories autorisées (doivent correspondre au backend). */
export const CATEGORIES = [
  { value: "BIGBAG", label: "Big bag" },
  { value: "ROCHE", label: "Roche" },
  { value: "AUTRE", label: "Autre" },
];

/**
 * Convertit une valeur en nombre (accepte la virgule française).
 * @param {string|number|null|undefined} v
 * @returns {number|null} null si non numérique
 */
export function asNumber(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}
