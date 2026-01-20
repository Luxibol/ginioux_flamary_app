/**
 * Sidebar (navigation latérale) du layout "Bureau".
 * - Sections : Administration + Bureau
 * - Affichage selon rôle :
 *   - ADMIN : produits + employés
 *   - BUREAU : produits (pas employés)
 */
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Paperclip,
  History,
  Package,
  Users,
} from "lucide-react";

import { getAuth } from "../../services/auth.storage.js";

/**
 * Sidebar Bureau (desktop) avec accès conditionnel selon rôle.
 * @returns {import("react").JSX.Element}
 */
function Sidebar() {
  const auth = getAuth();
  const role = auth?.user?.role || "";

  const canSeeAdminProducts = role === "ADMIN" || role === "BUREAU";
  const canSeeAdminEmployees = role === "ADMIN";

  const adminItems = [
    ...(role === "ADMIN"
      ? [{ to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, end: true }]
      : []),
    ...(canSeeAdminProducts
      ? [{ to: "/admin/produits", label: "Gestion des produits", icon: Package }]
      : []),
    ...(canSeeAdminEmployees
      ? [{ to: "/admin/employes", label: "Gestion des employés", icon: Users }]
      : []),
  ];

  const bureauItems = [
    ...(role === "ADMIN"
      ? []
      : [{ to: "/bureau", label: "Tableau de bord", icon: LayoutDashboard, end: true }]
    ),
    { to: "/bureau/commandes", label: "Commandes en cours", icon: ClipboardList },
    { to: "/bureau/expeditions", label: "Expéditions", icon: Truck },
    { to: "/bureau/import", label: "Import PDF", icon: Paperclip },
    { to: "/bureau/historique", label: "Historique", icon: History },
  ];

  /**
   * Rend une section de navigation.
   * @param {string} title Titre de section
   * @param {Array<{to:string, label:string, icon:any, end?:boolean}>} items Liens
   * @returns {import("react").JSX.Element|null}
   */
  function renderSection(title, items) {
    if (!items.length) return null;

    return (
      <div className="mb-4">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gf-subtitle">
          {title}
        </div>

        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "relative w-full h-11 px-3 rounded-xl text-left",
                      "flex items-center gap-3",
                      "text-sm hover:bg-gf-orange/10",
                      isActive
                        ? "bg-gf-orange/15 text-gf-orange font-medium"
                        : "text-gf-text",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-gf-orange" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-gf-border bg-gf-surface flex flex-col">
      <nav className="flex-1 p-3 pt-4">
        {role === "BUREAU" ? (
          <>
            {renderSection("Bureau", bureauItems)}
            {renderSection("Administration", adminItems)}
          </>
        ) : (
          <>
            {renderSection("Administration", adminItems)}
            {renderSection("Bureau", bureauItems)}
          </>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
