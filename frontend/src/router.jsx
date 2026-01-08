/**
 * Déclaration des routes de l'application (React Router v6).
 * - AppLayout : layout commun (Header + Sidebar + <Outlet />)
 * - /bureau/* : espace "Bureau" (pages principales)
 * - Redirect / -> /bureau
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";

import DashboardBureauPage from "./pages/bureau/DashboardBureauPage.jsx";
import OrdersPage from "./pages/bureau/OrdersPage.jsx";
import ShipmentsPage from "./pages/bureau/ShipmentsPage.jsx";
import ImportPdfPage from "./pages/bureau/ImportPdfPage.jsx";
import HistoryPage from "./pages/bureau/HistoryPage.jsx";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // Redirection racine -> /bureau (page par défaut)
      { index: true, element: <Navigate to="/bureau" replace /> },

      {
        path: "/bureau",
        children: [
          // Routes "Bureau" (toutes rendues dans AppLayout via <Outlet />)
          { index: true, element: <DashboardBureauPage /> },
          { path: "commandes", element: <OrdersPage /> },
          { path: "expeditions", element: <ShipmentsPage /> },
          { path: "import", element: <ImportPdfPage /> },
          { path: "historique", element: <HistoryPage /> },
        ],
      },
    ],
  },
]);
