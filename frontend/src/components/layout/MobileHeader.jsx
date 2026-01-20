/**
 * Header mobile générique (sticky)
 * - Logo
 * - Label (utilisateur + zone)
 * - Burger menu
 */
import logo from "../../assets/pictures/logo.png";
import { Menu } from "lucide-react";

/**
 * Header mobile (sticky) avec bouton menu.
 * @param {object} props
 * @param {string} props.label Libellé affiché (utilisateur / zone)
 * @param {boolean} props.isOpen État du menu
 * @param {()=>void} props.onToggle Toggle menu
 * @returns {import("react").JSX.Element}
 */
function MobileHeader({ label, isOpen, onToggle }) {
  return (
    <header className="sticky top-0 z-50 h-16 bg-gf-surface border-b border-gf-border">
      <div className="h-full flex items-center justify-between px-4">
        <img src={logo} alt="Ginioux Flamary" className="h-10 w-auto" />

        <div className="text-xs text-gf-text whitespace-nowrap">{label}</div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-gf-orange/10"
        >
          <Menu className="h-6 w-6 text-gf-orange" />
        </button>
      </div>
    </header>
  );
}

export default MobileHeader;
