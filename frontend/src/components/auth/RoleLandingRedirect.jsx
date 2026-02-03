/**
 * @file frontend/src/components/auth/RoleLandingRedirect.jsx
 * @description Redirige vers la page d’accueil selon le rôle (ADMIN/BUREAU/PRODUCTION).
 */
import { Navigate } from "react-router-dom";
import { getAuth } from "../../services/auth.storage.js";
import { landingPathForRole } from "../../utils/roleRouting.js";

export default function RoleLandingRedirect() {
  const auth = getAuth();
  // Fallback : Bureau si la session est absente (cas rare).
  const role = auth?.user?.role || "BUREAU";
  return <Navigate to={landingPathForRole(role)} replace />;
}
