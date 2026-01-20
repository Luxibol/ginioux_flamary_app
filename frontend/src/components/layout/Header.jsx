/**
 * Header (layout global)
 * - Affiche le logo
 * - Affiche l’utilisateur + bouton “Se déconnecter”
 */
import logo from "../../assets/pictures/logo.png";
import { Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logoutAndRedirect } from "../../services/auth.logout.js";
import { getUser } from "../../services/auth.storage.js";

/**
 * Formate un rôle pour l'affichage.
 * @param {string} role Rôle brut
 * @returns {string}
 */
function formatRole(role) {
  if (role === "ADMIN") return "Admin";
  if (role === "BUREAU") return "Bureau";
  if (role === "PRODUCTION") return "Production";
  return role || "—";
}

/**
 * Header global (desktop).
 * - Logo
 * - Utilisateur courant + déconnexion
 * @returns {import("react").JSX.Element}
 */
function Header() {
  const navigate = useNavigate();
  const user = getUser();

  const firstName = user?.first_name || "—";
  const roleLabel = formatRole(user?.role);

  return (
    <header className="h-16 flex items-center justify-between pl-6 pr-4 border-b border-gf-border bg-gf-surface">
      <div className="flex items-center">
        <img src={logo} alt="Ginioux Flamary" className="h-14 w-auto" />
      </div>

      <div className="flex items-center pr-6 gap-2 text-xs">
        <span className="text-gf-text whitespace-nowrap">{firstName} - {roleLabel}</span>
        <span className="text-gf-text"> | </span>

        <button
          type="button"
          onClick={() => logoutAndRedirect(navigate)}
          className="inline-flex items-center gap-2 whitespace-nowrap text-gf-orange hover:underline"
        >
          Se déconnecter
          <Power className="h-5 w-5 shrink-0" />
        </button>
      </div>
    </header>
  );
}

export default Header;
