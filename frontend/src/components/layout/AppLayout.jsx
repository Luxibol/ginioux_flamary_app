/**
 * Layout global de l’application.
 * - Bureau : Header + Sidebar + wrapper central
 * - Mobile (Production/Admin-mobile) : Header sticky + burger menu + contenu plein écran
 */
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileHeader from "./MobileHeader.jsx";
import MobileMenu from "./MobileMenu.jsx";
import { LayoutDashboard, ClipboardList, Truck } from "lucide-react";

function AppLayout() {
  const location = useLocation();

  const mode = useMemo(() => {
    const p = location.pathname;

    // Admin desktop-only (PC) : produits
    if (p.startsWith("/admin/produits")) return "admin_desktop";

    // Admin mobile (dashboard + employés plus tard)
    if (p.startsWith("/admin")) return "admin_mobile";

    if (p.startsWith("/production")) return "production";
    return "bureau";
  }, [location.pathname]);

  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu dès qu’on change de route
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // ⚠️ IMPORTANT : on définit mobileConfig AVANT de l’utiliser
  const mobileConfig = useMemo(() => {
    if (mode === "admin_mobile") {
      return {
        label: "Mathieu - Admin",
        items: [
          { to: "/admin", label: "Dashboard admin", end: true, icon: LayoutDashboard },

          // Tu ne veux PAS produits sur mobile => on ne met pas /admin/produits ici

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
          { to: "/production/commandes", label: "Commandes à produire", end: false, icon: ClipboardList },
          { to: "/production/expeditions", label: "Expéditions à charger", end: false, icon: Truck },
        ],
      };
    }

    return null;
  }, [mode]);

  const isMobileLayout = mode === "admin_mobile" || mode === "production";

  if (isMobileLayout) {
    // Sécurité anti-crash
    if (!mobileConfig) {
      return (
        <div className="min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
          <main className="min-h-dvh overflow-y-auto">
            <Outlet />
          </main>
        </div>
      );
    }

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

  // Bureau + admin_desktop
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
