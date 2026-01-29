/**
 * Layout global
 * - Desktop : Header + Sidebar + contenu
 * - Mobile : Header sticky + menu + contenu plein écran
 */
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import MobileHeader from "./MobileHeader.jsx";
import MobileMenu from "./MobileMenu.jsx";
import { LayoutDashboard, ClipboardList, Truck, Users } from "lucide-react";
import { getUser } from "../../services/auth.storage.js";

import {
  PullToRefreshMobileProvider,
  PullToRefreshIndicator,
} from "../../utils/pullToRefreshMobile.jsx";

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

export default function AppLayout() {
  const location = useLocation();
  const user = getUser();
  const who = `${user?.first_name || "—"} - ${formatRole(user?.role)}`;

  // hooks toujours en haut (jamais dans un if)
  const mainRef = useRef(null);

  const getScrollTop = useCallback(() => {
    return mainRef.current?.scrollTop ?? 0;
  }, []);

  // Détection responsive (<= lg)
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setIsSmallScreen(mq.matches);

    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const mode = useMemo(() => {
    const p = location.pathname;
    const role = user?.role;

    // Produits admin : desktop uniquement
    if (p.startsWith("/admin/produits")) return "admin_desktop";

    // Admin sur petit écran : conserve le mode admin
    if (
      role === "ADMIN" &&
      isSmallScreen &&
      (p.startsWith("/admin") || p.startsWith("/production"))
    ) {
      return "admin_mobile";
    }

    // Admin : mobile ou desktop selon taille écran
    if (p.startsWith("/admin"))
      return isSmallScreen ? "admin_mobile" : "admin_desktop";

    // Production : mobile
    if (p.startsWith("/production")) return "production";

    // Bureau : desktop
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

  // pull-to-refresh UNIQUEMENT sur /production (dashboard) et /admin (dashboard mobile)
  const enabledPull = useMemo(() => {
    if (!isMobileLayout) return false;
    const p = location.pathname.replace(/\/+$/, "");
    return p === "/production" || p === "/admin";
  }, [isMobileLayout, location.pathname]);

  // Garde-fou : produits indisponibles sur mobile
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
        <main ref={mainRef}
          className={
            mobileConfig
              ? "h-[calc(100dvh-4rem)] overflow-y-auto overscroll-y-contain touch-pan-y"
              : "min-h-dvh overflow-y-auto overscroll-y-contain touch-pan-y"
          }
        >
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

  // Mobile (Admin mobile + Production)
  if (isMobileLayout) {
    return (
      <div className="min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
        {mobileConfig ? (
          <>
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
          </>
        ) : null}

        <PullToRefreshMobileProvider enabled={enabledPull} getScrollTop={getScrollTop}>
          <PullToRefreshIndicator top={64} />
          <main
            ref={mainRef}
            className={mobileConfig ? "h-[calc(100dvh-4rem)] overflow-y-auto" : "min-h-dvh overflow-y-auto"}
          >
            <Outlet />
          </main>
        </PullToRefreshMobileProvider>
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
