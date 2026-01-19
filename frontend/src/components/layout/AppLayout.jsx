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
import { LayoutDashboard, ClipboardList, Truck, Users } from "lucide-react";
import { getUser } from "../../services/auth.storage.js";

function formatRole(role) {
  if (role === "ADMIN") return "Admin";
  if (role === "BUREAU") return "Bureau";
  if (role === "PRODUCTION") return "Production";
  return role || "—";
}

function AppLayout() {
  const location = useLocation();
  const user = getUser();
  const who = `${user?.first_name || "—"} - ${formatRole(user?.role)}`;

  // Affichage (confort) : on adapte selon largeur écran
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches; // <= lg
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setIsSmallScreen(mq.matches);

    // init + subscribe
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const mode = useMemo(() => {
      const p = location.pathname;
      const role = user?.role;

      // Admin produits = desktop only
      if (p.startsWith("/admin/produits")) return "admin_desktop";

      // ADMIN sur petit écran : garde le mode admin même sur /production/*
      if (
        role === "ADMIN" &&
        isSmallScreen &&
        (p.startsWith("/admin") || p.startsWith("/production"))
      ) {
        return "admin_mobile";
      }

      // Admin dashboard + employés = mobile ou desktop selon taille écran
      if (p.startsWith("/admin")) return isSmallScreen ? "admin_mobile" : "admin_desktop";

      // Production = mobile
      if (p.startsWith("/production")) return "production";

      // Bureau = desktop
      return "bureau";
    }, [location.pathname, isSmallScreen, user?.role]);

  const [menuOpen, setMenuOpen] = useState(false);

  const mobileConfig = useMemo(() => {
    if (mode === "admin_mobile") {
      return {
        label: who,
        items: [
          { kind: "section", label: "Administration" },
          { to: "/admin", label: "Dashboard admin", end: true, icon: LayoutDashboard },
          { to: "/admin/employes", label: "Gestion des employés", end: false, icon: Users },

          { kind: "section", label: "Production" },
          { to: "/production/commandes", label: "Commandes à produire", end: false, icon: ClipboardList },
          { to: "/production/expeditions", label: "Expéditions à charger", end: false, icon: Truck },
        ],
      };
    }

    if (mode === "production") {
      return {
        label: who,
        items: [
          { to: "/production", label: "Tableau de bord", end: true, icon: LayoutDashboard },
          { to: "/production/commandes", label: "Commandes à produire", end: false, icon: ClipboardList },
          { to: "/production/expeditions", label: "Expéditions à charger", end: false, icon: Truck },
        ],
      };
    }

    return null;
  }, [mode, who]);

  const isMobileLayout = mode === "admin_mobile" || mode === "production";

  // Guard UI : produits sur mobile => message
  if (mode === "admin_mobile" && location.pathname.startsWith("/admin/produits")) {
    return (
      <div className="min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
        <MobileHeader
          label={who}
          isOpen={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
        />
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={mobileConfig?.items || []}
        />
        <main className="h-[calc(100dvh-4rem)] overflow-y-auto p-6">
          <div className="rounded-2xl border border-gf-border bg-gf-surface p-6">
            <div className="text-sm font-semibold text-gf-title">Disponible sur PC</div>
            <div className="text-xs text-gf-subtitle mt-2">
              La gestion des produits est uniquement disponible sur ordinateur.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isMobileLayout) {
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

  // Desktop (Bureau + Admin desktop)
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
