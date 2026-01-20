/**
 * Import PDF (API)
 * - Prévisualisation (parsing) sans écriture en base
 * - Confirmation : création de commande depuis la preview
 * - Annulation : nettoyage serveur (preview)
 */
import { apiFetch } from "./apiClient.js";

/**
 * Prévisualise l'import d'un PDF (parsing) sans écriture en base.
 * - Ne pas fixer Content-Type : le navigateur gère le boundary multipart/form-data.
 * @param {File} file PDF à analyser
 * @returns {Promise<any>}
 */
export async function previewImport(file) {
  const fd = new FormData();
  fd.append("file", file);

  return apiFetch("/pdf/preview", {
    method: "POST",
    body: fd,
  });
}

/**
 * Confirme l'import d'une preview (écriture en base).
 * - Retourne un format stable pour l'UI : { ok, status, data }.
 * @param {string} importId Identifiant de preview
 * @param {{ preview?: object, internalComment?: string }} payload Données envoyées au backend
 * @returns {Promise<{ok:boolean, status:number, data:any}>}
 */
export async function confirmImport(importId, payload) {
  try {
    const data = await apiFetch(`/pdf/${importId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });

    return { ok: true, status: 200, data };
  } catch (e) {
    return {
      ok: false,
      status: e.status || 500,
      data: e.data || { error: e.message || "Erreur confirm" },
    };
  }
}

/**
 * Annule une preview (nettoyage côté serveur) si l'utilisateur ferme la modale.
 * @param {string} importId Identifiant de preview
 * @returns {Promise<any>}
 */
export async function cancelImport(importId) {
  return apiFetch(`/pdf/${importId}`, { method: "DELETE" });
}
