/**
 * Guard — Auth & Accès
 * - Bloque l'accès si non connecté
 * - Force le changement de mot de passe si requis
 * - Contrôle d'accès par rôle selon le chemin
 */
import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "../../services/auth.storage.js";
import { landingPathForRole } from "../../utils/roleRouting.js";

/**
 * Vérifie si un rôle peut accéder à un chemin.
 * @param {string} role Rôle utilisateur
 * @param {string} path Chemin courant (pathname)
 * @returns {boolean}
 */
function canAccessPath(role, path) {
  // Zone Admin
  if (path.startsWith("/admin")) {
    // Exception : Bureau peut accéder aux produits
    if (path.startsWith("/admin/produits")) return role === "ADMIN" || role === "BUREAU";
    // Employés : admin uniquement
    if (path.startsWith("/admin/employes")) return role === "ADMIN";
    // Dashboard admin : admin uniquement
    if (path === "/admin") return role === "ADMIN";
    // Par défaut : admin uniquement
    return role === "ADMIN";
  }

  // Zone Bureau
  if (path.startsWith("/bureau")) return role === "ADMIN" || role === "BUREAU";

  // Zone Production (admin autorisé)
  if (path.startsWith("/production")) return role === "ADMIN" || role === "PRODUCTION";

  return true;
}

/**
 * Protège une route (auth + rôle).
 * @param {object} props
 * @param {import("react").ReactNode} props.children Contenu protégé
 * @returns {import("react").JSX.Element}
 */
export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = getAuth();
  const path = location.pathname;

  // Non connecté : redirection login
  if (!auth?.token || !auth?.user) {
    return <Navigate to="/login" replace />;
  }

  // Mot de passe à changer : redirection forcée
  if (auth.user.must_change_password && path !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Mot de passe OK : sortie de change-password
  if (!auth.user.must_change_password && path === "/change-password") {
    return <Navigate to="/bureau" replace />;
  }

  // Accès refusé : fallback par rôle
  if (!canAccessPath(auth.user.role, path)) {
    // Fallback : landing page du rôle
    const fallback = landingPathForRole(auth.user.role);
    return <Navigate to={fallback} replace />;
  }

  return children;
}
