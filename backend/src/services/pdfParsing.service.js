/**
 * Convertit une date au format français JJ/MM/AAAA
 * en chaîne au format ISO AAAA-MM-JJ.
 *
 * @param {string} frDate - Date au format JJ/MM/AAAA.
 * @returns {string|null} Date au format AAAA-MM-JJ, ou null si le format est invalide.
 */
function toIsoDate(frDate) {
  const m = frDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Indique si un libellé de produit doit être ignoré
 * (ex : lignes de transport, lignes de REP, etc.).
 *
 * @param {string} label - Libellé de produit tel que lu dans le PDF.
 * @returns {boolean} true si le libellé doit être exclu, false sinon.
 */
function shouldIgnoreLabel(label) {
  if (!label) return true;

  const upper = label.toUpperCase();

  // Mots-clés à ignorer
  const bannedKeywords = ["TRANSPORT", "REP ", "REP\u00A0"];

  return bannedKeywords.some((kw) => upper.includes(kw));
}

/**
 * Analyse le texte brut d'un PDF d'accusé de réception et en extrait
 * les informations nécessaires à la création d'une commande.
 *
 * Entrée : texte complet retourné par pdf-parse (data.text).
 *
 * Sortie : un objet de la forme :
 * {
 *   arc: string|null,
 *   clientName: string|null,
 *   orderDate: string|null,              // "YYYY-MM-DD"
 *   products: Array<{ pdfLabel: string, quantity: number }>
 * }
 *
 * - arc : numéro d'ARC extrait de l'entête "ACCUSE DE RECEPTION ... n°"
 * - clientName : nom du client (ligne située juste avant le code postal)
 * - orderDate : date de commande convertie au format ISO
 * - products : lignes produits (libellé tel que dans le PDF + quantité)
 *
 * @param {string} text - Contenu texte complet du PDF.
 * @returns {{
 *   arc: string|null,
 *   clientName: string|null,
 *   orderDate: string|null,
 *   products: Array<{ pdfLabel: string, quantity: number }>
 * }} Objet représentant la commande extraite.
 */
function parseOrderFromPdfText(text) {
  const result = {
    arc: null,
    clientName: null,
    orderDate: null,
    products: [],
  };

  if (!text || typeof text !== "string") {
    return result;
  }

  const normalized = text.replace(/\r\n/g, "\n");

  // --- ARC ---
  const arcMatch =
    normalized.match(/ACCUSE DE RECEPTION[\s\S]*?n[°º]?\s*([0-9]{6,})/i) ||
    normalized.match(/\bn[°º]?\s*([0-9]{6,})/i);

  if (arcMatch) {
    result.arc = arcMatch[1];
  }

  // --- Date de commande ---
  const dateMatch =
    normalized.match(/COMMANDE DU\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    normalized.match(/\bdu\s+(\d{2}\/\d{2}\/\d{4})/i);

  if (dateMatch) {
    result.orderDate = toIsoDate(dateMatch[1]);
  }

  // --- Lignes du texte ---
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // --- Nom client (ligne avant le CP/ville) ---
  for (let i = 1; i < lines.length; i++) {
    if (/\d{5}\s*\S+/i.test(lines[i])) {
      result.clientName = lines[i - 1];
      break;
    }
  }

  // --- Produits ---
  //
  // Pattern quantité + montants sur une seule ligne, ex : "6,00445,8074,30"
  const qtyLineRegex = /^(\d+,\d{2})\s*\d+,\d{2}\s*\d+,\d{2}$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(qtyLineRegex);
    if (!m) continue;

    const quantityStr = m[1]; // "6,00"
    const quantity = parseFloat(quantityStr.replace(",", "."));

    const labelLine = lines[i + 1] || "";
    const pdfLabel = labelLine.trim();

    // Filtre les libellés qu'on ne veut pas garder
    if (!pdfLabel || shouldIgnoreLabel(pdfLabel)) {
      // on saute quand même les deux lignes suivantes pour rester aligné
      i += 2;
      continue;
    }

    result.products.push({
      pdfLabel,
      quantity,
    });

    // On saute la ligne suivante (libellé) + la suivante (le "1")
    i += 2;
  }

  return result;
}

module.exports = {
  parseOrderFromPdfText,
};
