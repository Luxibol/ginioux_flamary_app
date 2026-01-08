/**
 * Ajoute un message (toast/feedback) en tête de liste et limite l'historique.
 * @param {Array<{type:string, text:string}>} prev Liste actuelle (du plus récent au plus ancien)
 * @param {string} type Type de message ("success" | "error" | "info" | ...)
 * @param {string} text Contenu du message
 * @param {number} limit Nombre max de messages conservés
 * @returns {Array<{type:string, text:string}>} Nouvelle liste tronquée
 */
export function pushMessage(prev, type, text, limit = 6) {
  return [{ type, text }, ...prev].slice(0, limit);
}
