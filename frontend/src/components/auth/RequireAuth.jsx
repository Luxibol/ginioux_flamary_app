import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "../../services/auth.storage.js";

function canAccessPath(role, path) {
  // ADMIN area
  if (path.startsWith("/admin")) {
    // BUREAU a aussi accès aux produits
    if (path.startsWith("/admin/produits")) return role === "ADMIN" || role === "BUREAU";
    // employés = admin only
    if (path.startsWith("/admin/employes")) return role === "ADMIN";
    // dashboard admin = admin only
    if (path === "/admin") return role === "ADMIN";
    // par défaut : admin only
    return role === "ADMIN";
  }

  // Bureau area
  if (path.startsWith("/bureau")) return role === "ADMIN" || role === "BUREAU";

  // Production area (admin y a accès)
  if (path.startsWith("/production")) return role === "ADMIN" || role === "PRODUCTION";

  return true;
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const auth = getAuth();
  const path = location.pathname;

  // non connecté => login
  if (!auth?.token || !auth?.user) {
    return <Navigate to="/login" replace />;
  }

  // doit changer le mdp => on force
  if (auth.user.must_change_password && path !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // si mdp ok mais on est sur change-password => on dégage
  if (!auth.user.must_change_password && path === "/change-password") {
    return <Navigate to="/bureau" replace />;
  }

  // contrôle d'accès par rôle
  if (!canAccessPath(auth.user.role, path)) {
    // fallback simple selon rôle
    const fallback =
      auth.user.role === "ADMIN"
        ? "/admin"
        : auth.user.role === "BUREAU"
        ? "/bureau"
        : "/production/commandes";

    return <Navigate to={fallback} replace />;
  }

  return children;
}
