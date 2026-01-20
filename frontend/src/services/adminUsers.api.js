/**
 * Admin — Utilisateurs (API)
 * - Liste avec filtres (q, role, active)
 * - Création / mise à jour partielle
 * - Réinitialisation mot de passe
 */
import { apiFetch } from "./apiClient.js";

/**
 * Liste des utilisateurs (filtres optionnels).
 * @param {object} [options]
 * @param {string} [options.q] Recherche texte
 * @param {string} [options.role] Rôle (ex: ADMIN, BUREAU, PRODUCTION)
 * @param {string|number|boolean} [options.active] Filtre actif/inactif
 * @returns {Promise<any>}
 */
export function listUsers({ q, role, active } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (active !== undefined && active !== "")
    params.set("active", String(active));

  const qs = params.toString();
  return apiFetch(`/admin/users${qs ? `?${qs}` : ""}`);
}

/**
 * Crée un utilisateur.
 * @param {object} payload Données de création (selon le contrat API)
 * @returns {Promise<any>}
 */
export function createUser(payload) {
  return apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Met à jour partiellement un utilisateur.
 * @param {number|string} id Identifiant utilisateur
 * @param {object} patch Champs à modifier (selon le contrat API)
 * @returns {Promise<any>}
 */
export function patchUser(id, patch) {
  return apiFetch(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/**
 * Réinitialise le mot de passe d’un utilisateur (admin).
 * @param {number|string} id Identifiant utilisateur
 * @returns {Promise<any>}
 */
export function resetUserPassword(id) {
  return apiFetch(`/admin/users/${id}/reset-password`, {
    method: "POST",
  });
}
