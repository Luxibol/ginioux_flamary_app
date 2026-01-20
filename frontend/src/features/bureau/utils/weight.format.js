/**
 * Utils - Bureau : formats de poids
 * - formatKg : affiche un poids en kg (arrondi à l'entier)
 * - formatTons : affiche un poids en tonnes (kg -> t, 1 décimale max)
 */

/**
 * Formate un poids en kilogrammes (arrondi).
 * @param {number|string|null|undefined} kg
 * @returns {string} Exemple : "1 250 kg"
 */
export function formatKg(kg) {
  const n = Number(kg ?? 0);
  if (!Number.isFinite(n)) return "0 kg";
  return `${Math.round(n).toLocaleString("fr-FR")} kg`;
}

/**
 * Formate un poids en tonnes.
 * @param {number|string|null|undefined} kg
 * @returns {string} Exemple : "1,3 t"
 */
export function formatTons(kg) {
  const n = Number(kg ?? 0);
  if (!Number.isFinite(n)) return "0 t";
  return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} t`;
}
