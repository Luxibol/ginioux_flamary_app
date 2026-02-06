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
 * Normalise un libellé PDF (espaces multiples + NBSP) pour fiabiliser les comparaisons.
 * @param {string} s
 * @returns {string}
 */
function normalizePdfLabel(s) {
  return String(s ?? "")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Indique si un libellé PDF doit être ignoré (transport/REP/TGAP...).
 * @param {string} label
 * @returns {boolean}
 */
function shouldIgnoreLabel(label) {
  if (!label) return true;

  const upper = normalizePdfLabel(label).toUpperCase();

  // Mots-clés à ignorer
  const bannedKeywords = [
    "TRANSPORT",
    "REP ",
    "REP\u00A0",
    "REP1",
    "TGAP",
    "GRATUIT",
    "TVA",
    "TOTAL",
    "BASE H.T",
    "T.T.C",
    "T.V.A",
  ];

  return bannedKeywords.some((kw) => upper.includes(kw));
}

/**
 * Détecte si une ligne ressemble à un libellé produit (ligne de libellé).
 * @param {string} label
 * @returns {boolean}
 */
function isProductLabel(label) {
  const s = normalizePdfLabel(label);
  if (!s) return false;

  // Cas 1: "(7) ..."
  if (/^\(\d+\)\s+/.test(s)) return true;

  // Cas 2: libellé texte (PIQUET..., DALLE...) -> au moins une lettre
  // (on évite les lignes purement numériques)
  return /[A-ZÀ-ÿ]/.test(s);
}

/**
 * Extrait la quantité depuis une ligne "libellé + colonnes" (QTE PRIX MONTANT ...).
 * @param {string} line
 * @returns {number|null}
 */
function extractQtyFromSameLine(line) {
  const s = String(line || "");

  // Cherche la fin de ligne "... QTE PRIX MONTANT (T optionnel)"
  // Exemple: "PIQUET ... 4,00 10,17 40,68 1"
  const m = s.match(/(\d+,\d{2})\s+(\d+,\d{2})\s+(\d+,\d{2})(?:\s+\d+)?\s*$/);
  if (!m) return null;

  const qty = Number(m[1].replace(",", "."));
  return Number.isFinite(qty) ? qty : null;
}

/**
 * Extrait la quantité depuis la ligne précédente (format PDF avec chiffres collés ou "1,00").
 * @param {string} prevLine
 * @returns {number|null}
 */
function extractQtyFromPrevLine(prevLine) {
  // prevLine peut être "3,00144,0048,00" (collé) ou "1,00"
  const m = String(prevLine || "").match(/^(\d+,\d{2})/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
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

  for (let i = 0; i < lines.length; i++) {
    const label = lines[i]?.trim?.() || "";
    if (!label) continue;

    // ignore titres/transport/REP/TGAP/GRATUIT/totaux...
    if (shouldIgnoreLabel(label)) continue;

    // il faut un "label produit" (soit (n), soit texte)
    if (!isProductLabel(label)) continue;

    // 1) tente format A : quantité sur la ligne précédente (si elle commence par un nombre)
    let quantity = extractQtyFromPrevLine(lines[i - 1] || "");

    // 2) sinon format B : quantité dans la même ligne
    if (quantity === null) {
      quantity = extractQtyFromSameLine(label);
    }

    if (quantity === null) continue;

    result.products.push({ pdfLabel: normalizePdfLabel(label), quantity });
  }

  return result;
}

module.exports = {
  parseOrderFromPdfText,
};
