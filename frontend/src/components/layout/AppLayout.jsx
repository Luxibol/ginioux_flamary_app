/**
 * Layout global de l’application.
 * - Affiche le Header + Sidebar
 * - Réserve une zone centrale pour les pages via <Outlet />
 * - Gère la hauteur “plein écran” + scroll uniquement dans le contenu (<main>)
 */
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

function AppLayout() {
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
