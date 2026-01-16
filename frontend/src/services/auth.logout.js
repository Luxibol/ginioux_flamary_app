// src/services/auth.logout.js
import { clearAuth } from "./auth.storage.js";

/**
 * Déconnecte l'utilisateur et redirige vers /login
 * @param {(to: string, opts?: any) => void} navigate - hook useNavigate()
 */
export function logoutAndRedirect(navigate) {
  clearAuth();
  navigate("/login", { replace: true });
}
