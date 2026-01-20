/**
 * Menu burger mobile générique
 * - Overlay + panneau sous le header
 * - Fermeture : overlay, clic item, bouton déconnexion
 */
import { NavLink, useNavigate } from "react-router-dom";
import { Power } from "lucide-react";
import { logoutAndRedirect } from "../../services/auth.logout.js";

/**
 * Menu mobile (overlay + panneau).
 * @param {object} props
 * @param {boolean} props.open Affiche/masque le menu
 * @param {()=>void} props.onClose Ferme le menu
 * @param {Array<any>} props.items Items de navigation (liens + sections)
 * @returns {import("react").JSX.Element|null}
 */
function MobileMenu({ open, onClose, items }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label="Fermer le menu"
        onClick={onClose}
      />

      <div className="fixed top-16 left-0 right-0 z-50 bg-gf-surface border-b border-gf-border shadow-sm">
        <nav className="py-2">
          <ul>
            {items.map((it, idx) => {
              // Titre de section
              if (it.kind === "section") {
                return (
                  <li key={`section-${idx}`} className="px-4 pt-3 pb-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gf-subtitle">
                      {it.label}
                    </div>
                  </li>
                );
              }

              const Icon = it.icon;

              return (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        "px-4 py-3 text-sm",
                        "hover:bg-gf-orange/10",
                        "flex items-center gap-3",
                        isActive
                          ? "text-gf-orange font-medium"
                          : "text-gf-text",
                      ].join(" ")
                    }
                  >
                    {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                    <span className="truncate">{it.label}</span>
                  </NavLink>
                </li>
              );
            })}

            <li>
              <button
                aria-label="Se déconnecter"
                type="button"
                onClick={() => {
                  onClose();
                  logoutAndRedirect(navigate);
                }}
                className="w-full text-left px-4 py-3 text-sm text-gf-text hover:bg-gf-orange/10 flex items-center gap-3"
              >
                <Power className="h-5 w-5 shrink-0" />
                <span className="truncate">Déconnexion</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}

export default MobileMenu;
