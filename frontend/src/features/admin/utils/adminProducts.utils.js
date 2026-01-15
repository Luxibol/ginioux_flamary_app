/**
 * Utils - Admin Produits
 * - Constantes de catégories
 * - Helpers de parsing (ex: poids saisi en "1000" ou "1000,5")
 */

/** Catégories autorisées côté UI (doivent matcher celles du backend). */
export const CATEGORIES = [
  { value: "BIGBAG", label: "Big bag" },
  { value: "ROCHE", label: "Roche" },
  { value: "AUTRE", label: "Autre" },
];

/**
 * Convertit une valeur (string/number) en Number.
 * - Accepte la virgule française ("1000,5")
 * - Retourne null si non-numérique
 */
export function asNumber(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}
