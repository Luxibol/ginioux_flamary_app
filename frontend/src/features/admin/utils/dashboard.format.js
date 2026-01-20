/**
 * Utils — Dashboard admin : formatage dates, états et priorités.
 */

/**
 * Formate une date en français.
 * @param {string|Date|null|undefined} v
 * @returns {string}
 */
export function formatDateFr(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

/**
 * Compare 2 dates sur la même journée (année/mois/jour).
 * @param {string|Date|null|undefined} a
 * @param {string|Date|null|undefined} b
 * @returns {boolean}
 */
export function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function priorityLabel(p) {
  if (p === "URGENT") return "Urgent";
  if (p === "INTERMEDIAIRE") return "Intermédiaire";
  return "Normal";
}

export function priorityClass(p) {
  if (p === "URGENT") return "text-gf-danger";
  if (p === "INTERMEDIAIRE") return "text-gf-orange";
  return "text-gf-title";
}

export function formatOrderStateLabel(v) {
  // Mapping UI des états de commande.
  if (!v) return "—";
  if (v === "NON_EXPEDIEE") return "En préparation";
  if (v === "EXP_PARTIELLE") return "Partiellement expédiée";
  if (v === "EXP_COMPLETE") return "Expédiée";
  return v;
}
