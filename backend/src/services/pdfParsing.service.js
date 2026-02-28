/**
 * @file backend/src/services/pdfParsing.service.js
 * @description Parse le texte brut d'un PDF de commande et extrait :
 * - arc (numéro ARC)
 * - clientName
 * - orderDate (ISO YYYY-MM-DD)
 * - products: [{ pdfLabel, quantity }]
 *
 * Particularités gérées :
 * - lignes "chiffres collés" : "6,00374,2862,38" (QTE + MONTANT + PU)
 * - libellé sur plusieurs lignes (retours à la ligne dans le PDF)
 * - lignes taxe isolées ("1") ignorées
 * - lignes à ignorer (transport/REP/TGAP/totaux...)
 */

/**
 * Convertit une date FR "JJ/MM/AAAA" en ISO "AAAA-MM-JJ".
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
 * Normalise une chaîne issue du PDF (NBSP, espaces multiples).
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
 * Indique si un libellé doit être ignoré (transport / REP / TGAP / totaux...).
 * @param {string} label
 * @returns {boolean}
 */
function shouldIgnoreLabel(label) {
  if (!label) return true;

  const upper = normalizePdfLabel(label).toUpperCase();
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
 * Détermine si une ligne ressemble à un libellé produit.
 * Objectif : éviter de considérer une continuation (ex: "pouzzolane)") comme un nouveau produit.
 * @param {string} label
 * @returns {boolean}
 */
function isProductLabel(label) {
  const s = normalizePdfLabel(label);
  if (!s) return false;

  // Cas "(47) ..."
  if (/^\(\d+\)\s+/.test(s)) return true;

  // Mots-clés typiques produit
  if (/\b(BIG\s+BAG|VRAC|PALETTE|SAC|TONNE|M3|M²|M2|KG)\b/i.test(s))
    return true;

  // Sinon : au moins 3 mots et au moins un mot en MAJ (évite les lignes en minuscules seules)
  const words = s.split(" ").filter(Boolean);
  const hasUpperWord = words.some((w) => /[A-ZÀ-Ý]{2,}/.test(w));
  return words.length >= 3 && hasUpperWord;
}

/**
 * Extrait la QTE depuis une ligne "libellé ... QTE PRIX MONTANT" (format classique).
 * @param {string} line
 * @returns {number|null}
 */
function extractQtyFromSameLine(line) {
  const s = String(line || "");
  const m = s.match(/(\d+,\d{2})\s+(\d+,\d{2})\s+(\d+,\d{2})(?:\s+\d+)?\s*$/);
  if (!m) return null;

  const qty = Number(m[1].replace(",", "."));
  return Number.isFinite(qty) ? qty : null;
}

/**
 * Extrait la QTE depuis la ligne précédente (format PDF avec chiffres collés ou "1,00").
 * @param {string} prevLine
 * @returns {number|null}
 */
function extractQtyFromPrevLine(prevLine) {
  const m = String(prevLine || "").match(/^(\d+,\d{2})/);
  if (!m) return null;

  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Détecte une ligne "3 nombres collés" :
 * ex: "6,00374,2862,38" => QTE=6,00 (puis montant, puis PU).
 * @param {string} line
 * @returns {{qty:number}|null}
 */
function extractPackedNumbersLine(line) {
  const s = normalizePdfLabel(line);
  const m = s.match(/^(\d+,\d{2})(\d+,\d{2})(\d+,\d{2})$/);
  if (!m) return null;

  const qty = Number(m[1].replace(",", "."));
  if (!Number.isFinite(qty)) return null;

  return { qty };
}

/**
 * Ligne taxe isolée, ex: "1"
 * @param {string} line
 * @returns {boolean}
 */
function isTaxOnlyLine(line) {
  return /^\d+$/.test(normalizePdfLabel(line));
}

/**
 * Parse le texte d'un PDF et retourne une structure de commande.
 * @param {string} text
 * @returns {{arc:string|null, clientName:string|null, orderDate:string|null, products:Array<{pdfLabel:string, quantity:number}>}}
 */
function parseOrderFromPdfText(text) {
  const result = { arc: null, clientName: null, orderDate: null, products: [] };
  if (!text || typeof text !== "string") return result;

  const normalized = text.replace(/\r\n/g, "\n");

  // ARC
  const arcMatch =
    normalized.match(/ACCUSE DE RECEPTION[\s\S]*?n[°º]?\s*([0-9]{6,})/i) ||
    normalized.match(/\bn[°º]?\s*([0-9]{6,})/i);
  if (arcMatch) result.arc = arcMatch[1];

  // Date
  const dateMatch =
    normalized.match(/COMMANDE DU\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    normalized.match(/\bdu\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) result.orderDate = toIsoDate(dateMatch[1]);

  // Lignes
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Client (heuristique existante)
  for (let i = 1; i < lines.length; i++) {
    if (/\d{5}\s*\S+/i.test(lines[i])) {
      result.clientName = lines[i - 1];
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const label = lines[i]?.trim?.() || "";
    if (!label) continue;
    if (shouldIgnoreLabel(label)) continue;

    // --- CAS 1 : ligne "3 nombres collés" puis libellé sur 1..n lignes ---
    const packed = extractPackedNumbersLine(label);
    if (packed) {
      let fullLabel = "";
      let j = i + 1;

      // Le libellé se trouve sur les lignes suivantes jusqu'à une taxe ("1") ou une nouvelle ligne chiffres collés
      while (j < lines.length) {
        const next = normalizePdfLabel(lines[j] || "");
        if (!next) break;
        if (shouldIgnoreLabel(next)) break;
        if (isTaxOnlyLine(next)) break;
        if (extractPackedNumbersLine(next)) break;

        fullLabel = fullLabel ? `${fullLabel} ${next}` : next;
        j++;
      }

      fullLabel = normalizePdfLabel(fullLabel)
        .replace(/\+\s*$/g, "")
        .trim();
      if (fullLabel)
        result.products.push({ pdfLabel: fullLabel, quantity: packed.qty });

      i = j - 1;
      continue;
    }

    // --- CAS 2 : formats historiques (libellé + quantité) ---
    if (!isProductLabel(label)) continue;

    let quantity = extractQtyFromPrevLine(lines[i - 1] || "");
    if (quantity === null) quantity = extractQtyFromSameLine(label);
    if (quantity === null) continue;

    result.products.push({ pdfLabel: normalizePdfLabel(label), quantity });
  }

  return result;
}

module.exports = { parseOrderFromPdfText };
