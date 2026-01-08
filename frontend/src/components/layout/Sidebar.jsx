/**
 * Sidebar (navigation latérale) du layout "Bureau".
 * - Définit les entrées du menu (routes + label + icône)
 * - Utilise <NavLink> pour gérer l'état actif (styles + barre orange à droite)
 */
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Paperclip,
  History,
} from "lucide-react";

const menuItems = [
  { to: "/bureau", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/bureau/commandes", label: "Commandes en cours", icon: ClipboardList },
  { to: "/bureau/expeditions", label: "Expéditions", icon: Truck },
  { to: "/bureau/import", label: "Import PDF", icon: Paperclip },
  { to: "/bureau/historique", label: "Historique", icon: History },
];

function Sidebar() {
  return (
    <aside className="w-64 border-r border-gf-border bg-gf-surface flex flex-col">
      <nav className="flex-1 p-3 pt-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
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
      </nav>
    </aside>
  );
}

export default Sidebar;
