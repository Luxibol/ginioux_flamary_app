/**
 * Helpers d’affichage (formatage) pour les commandes :
 * dates, libellés de priorité, classes CSS, et normalisation numérique.
 */

/**
 * Formate une date ISO en date FR (jj/mm/aaaa) pour l’UI.
 * Retourne "—" si vide, et la valeur brute si non parseable.
 */
export function formatDateFr(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR");
}

/**
 * Convertit une priorité backend ("URGENT" | "INTERMEDIAIRE" | "NORMAL") en libellé UI.
 */
export function priorityLabel(p) {
  if (p === "URGENT") return "Urgent";
  if (p === "INTERMEDIAIRE") return "Intermédiaire";
  return "Normal";
}

/**
 * Retourne la classe CSS associée à la priorité (couleur).
 */
export function priorityClass(p) {
  if (p === "URGENT") return "text-gf-danger";
  if (p === "INTERMEDIAIRE") return "text-gf-orange";
  return "text-gf-success";
}

/**
 * Force une valeur numérique exploitable (fallback à 0 si invalide).
 */
export function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}
