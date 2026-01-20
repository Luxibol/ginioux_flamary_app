/**
 * Auth (API)
 * - Connexion utilisateur
 * - Changement de mot de passe (utilisateur connecté)
 */
import { apiFetch } from "./apiClient.js";

/**
 * Connexion.
 * @param {object} payload
 * @param {string} payload.login Identifiant (login / email selon l’API)
 * @param {string} payload.password Mot de passe
 * @returns {Promise<any>}
 */
export function login({ login, password }) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

/**
 * Change le mot de passe (session requise).
 * @param {object} payload
 * @param {string} payload.new_password Nouveau mot de passe
 * @returns {Promise<any>}
 */
export function changePassword({ new_password }) {
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ new_password }),
  });
}
