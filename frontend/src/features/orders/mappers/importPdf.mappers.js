/**
 * Construit un message d'erreur lisible pour l'import PDF.
 * Cas géré : le backend peut renvoyer une liste `missingLabels` (422) à afficher en détail.
 * @param {unknown} err Erreur (souvent issue d'un appel API)
 * @returns {string} Message prêt à afficher dans l'UI
 */
export function buildImportErrorMessage(err) {
  const missing = err?.data?.missingLabels;

  if (Array.isArray(missing) && missing.length > 0) {
    const base = err?.message || "Import impossible.";
    return `${base}\nProduits manquants :\n- ${missing.join("\n- ")}`;
  }

  return err?.message || "Import impossible.";
}
