/**
 * Layout global de l’application.
 * - Bureau : Header + Sidebar + wrapper central (inchangé)
 * - Mobile (Production/Admin) : Header sticky + burger menu + contenu plein écran
 */
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileHeader from "./MobileHeader.jsx";
import MobileMenu from "./MobileMenu.jsx";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Shield,
} from "lucide-react";

function AppLayout() {
  const location = useLocation();

  const mode = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/production")) return "production";
    return "bureau";
  }, [location.pathname]);

  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu dès qu’on change de route
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const mobileConfig = useMemo(() => {
    if (mode === "admin") {
      return {
        label: "Mathieu - Admin",
        items: [
          { to: "/admin", label: "Dashboard admin", end: true, icon: LayoutDashboard },
          { to: "/admin/gestion", label: "Gestion", end: false, icon: Shield },
          // Accès aux pages production (SANS dashboard production)
          { to: "/production/commandes", label: "Commandes à produire", end: false, icon: ClipboardList },
          { to: "/production/expeditions", label: "Expéditions à charger", end: false, icon: Truck },
        ],
      };
    }

    if (mode === "production") {
      return {
        label: "Mathieu - Production",
        items: [
          { to: "/production", label: "Tableau de bord", end: true, icon: LayoutDashboard },
          { to: "/production/commandes", label: "Commandes à produire", icon: ClipboardList },
          { to: "/production/expeditions", label: "Expéditions à charger", icon: Truck },
        ],
      };
    }

    return null;
  }, [mode]);

  if (mode === "admin" || mode === "production") {
    return (
      <div className="min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
        <MobileHeader
          label={mobileConfig.label}
          isOpen={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
        />
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={mobileConfig.items}
        />

        <main className="h-[calc(100dvh-4rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Bureau
  return (
    <div className="min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
      <Header />

      <div className="flex h-[calc(100dvh-4rem)] min-h-0">
        <Sidebar />

        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="min-h-full rounded-2xl border border-gf-border bg-gf-surface shadow-sm p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
