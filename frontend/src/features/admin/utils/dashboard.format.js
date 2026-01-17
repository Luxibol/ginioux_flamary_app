export function formatDateFr(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

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
  // Tu m’as donné les valeurs BDD. Si tu as déjà un champ `order_state_label`, on l'utilise.
  if (!v) return "—";
  if (v === "NON_EXPEDIEE") return "En préparation";
  if (v === "EXP_PARTIELLE") return "Partiellement expédiée";
  if (v === "EXP_COMPLETE") return "Expédiée";
  return v;
}
