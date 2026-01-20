/**
 * Auth — Déconnexion (Frontend)
 * - Nettoie la session locale (storage)
 * - Redirige vers /login
 */
import { clearAuth } from "./auth.storage.js";

/**
 * Déconnecte l'utilisateur et redirige vers /login.
 * @param {(to: string, opts?: any) => void} navigate Fonction de navigation (useNavigate)
 * @returns {void}
 */
export function logoutAndRedirect(navigate) {
  clearAuth();
  navigate("/login", { replace: true });
}
