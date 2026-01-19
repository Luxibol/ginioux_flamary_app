/**
 * Helpers de normalisation pour la modale :
 * - dates au format ISO (YYYY-MM-DD)
 * - priorités (libellés UI -> valeurs backend)
 * - lignes produits (import PDF / détails commande) vers un format unique
 */

/**
 * Normalise une date en chaîne ISO "YYYY-MM-DD" pour les inputs.
 * Accepte une string ISO, un Date, ou une valeur convertible par `new Date(...)`.
 * Retourne "" si la valeur est invalide.
 */
export function toISODate(v) {
  if (!v) return "";

  // déjà YYYY-MM-DD
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convertit la priorité affichée dans l'UI en valeur attendue par le backend.
 */
export function normalizePriority(priority) {
  if (priority === "Urgent") return "URGENT";
  if (priority === "Intermédiaire") return "INTERMEDIAIRE";
  return priority || "NORMAL";
}

/**
 * Normalise des lignes produits venant de différentes sources en un format unique pour la modale.
 * Sources possibles :
 * - import PDF : { products: [{ pdfLabel, quantity, ... }] } (ou { preview: { products: [...] } })
 * - détails commande : { lines: [...] }
 */
export function normalizeModalLines(data) {
  const src = data?.preview ?? data;

  // import
  if (Array.isArray(src?.products)) {
    return src.products.map((p) => ({
      label: p.pdfLabel ?? p.label ?? p.pdf_label_exact ?? "",
      productId: p.productId ?? p.product_id ?? null,
      id: p.id ?? null,
      weightKg: "",
      quantity: Number(p.quantity ?? 0),
    }));
  }

  // orders
  if (Array.isArray(src?.lines)) {
    return src.lines.map((l) => ({
      id: l.id ?? null,
      productId: l.productId ?? l.product_id ?? null,
      label: l.product ?? l.label ?? "",
      weightKg: l.poidsKg ?? l.weight_per_unit_kg ?? "",
      quantity: Number(l.quantite ?? l.quantity_ordered ?? 0),
    }));
  }

  return [];
}
