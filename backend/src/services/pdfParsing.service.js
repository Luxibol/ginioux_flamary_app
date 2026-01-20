/**
 * @file backend/src/services/pdfParsing.service.js
 * @description Service parsing PDF : extrait {arc, clientName, orderDate, products} depuis le texte.
 */

/**
 * Convertit JJ/MM/AAAA -> AAAA-MM-JJ.
 * @param {string} frDate
 * @returns {string|null}
 */
function toIsoDate(frDate) {
  const m = frDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Indique si un libellé PDF doit être ignoré (transport/REP/TGAP...).
 * @param {string} label
 * @returns {boolean}
 */
function shouldIgnoreLabel(label) {
  if (!label) return true;

  const upper = label.toUpperCase();

  // Mots-clés à ignorer
  const bannedKeywords = ["TRANSPORT", "REP ", "REP\u00A0", "REP1", "TGAP"];

  return bannedKeywords.some((kw) => upper.includes(kw));
}

/**
 * Parse le texte d'un PDF et retourne une structure de commande.
 * @param {string} text
 * @returns {{arc:string|null, clientName:string|null, orderDate:string|null, products:Array<{pdfLabel:string, quantity:number}>}}
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

  const arcMatch =
    normalized.match(/ACCUSE DE RECEPTION[\s\S]*?n[°º]?\s*([0-9]{6,})/i) ||
    normalized.match(/\bn[°º]?\s*([0-9]{6,})/i);

  if (arcMatch) {
    result.arc = arcMatch[1];
  }

  const dateMatch =
    normalized.match(/COMMANDE DU\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    normalized.match(/\bdu\s+(\d{2}\/\d{2}\/\d{4})/i);

  if (dateMatch) {
    result.orderDate = toIsoDate(dateMatch[1]);
  }

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 1; i < lines.length; i++) {
    if (/\d{5}\s*\S+/i.test(lines[i])) {
      result.clientName = lines[i - 1];
      break;
    }
  }

  const qtyLineRegex = /^(\d+,\d{2})\s*\d+,\d{2}\s*\d+,\d{2}$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(qtyLineRegex);
    if (!m) continue;

    const quantityStr = m[1];
    const quantity = parseFloat(quantityStr.replace(",", "."));

    const labelLine = lines[i + 1] || "";
    const pdfLabel = labelLine.trim();

    if (!pdfLabel || shouldIgnoreLabel(pdfLabel)) {
      i += 2;
      continue;
    }

    result.products.push({
      pdfLabel,
      quantity,
    });

    i += 2;
  }

  return result;
}

module.exports = {
  parseOrderFromPdfText,
};
