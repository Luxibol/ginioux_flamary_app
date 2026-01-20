/**
 * Routing — redirection par rôle
 * - Retourne la route d'accueil selon le rôle utilisateur
 */

/**
 * Retourne la route d'accueil selon le rôle.
 * @param {string} role Rôle utilisateur (ADMIN | BUREAU | PRODUCTION)
 * @returns {string}
 */
export function landingPathForRole(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "BUREAU") return "/bureau";
  if (role === "PRODUCTION") return "/production";
  return "/bureau";
}
