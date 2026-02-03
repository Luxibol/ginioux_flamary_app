/**
 * Déclaration des routes de l'application (React Router v6).
 * - AppLayout : layout commun (Bureau desktop / Production mobile selon la route)
 * - /bureau/* : espace "Bureau"
 * - /production/* : espace "Production" (mobile)
 * - /admin/* : espace "Admin" (dashboard + produits desktop + employés pc/mobile)
 * - / : redirection vers la page d’accueil selon le rôle (voir RoleLandingRedirect)
 */
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";

// AUTH
import LoginPage from "./pages/auth/LoginPage.jsx";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";

// Bureau
import DashboardBureauPage from "./pages/bureau/DashboardBureauPage.jsx";
import OrdersPage from "./pages/bureau/OrdersPage.jsx";
import ShipmentsPage from "./pages/bureau/ShipmentsPage.jsx";
import ImportPdfPage from "./pages/bureau/ImportPdfPage.jsx";
import HistoryPage from "./pages/bureau/HistoryPage.jsx";

// Production
import DashboardProductionPage from "./pages/production/DashboardProductionPage.jsx";
import ProductionOrdersPage from "./pages/production/ProductionOrdersPage.jsx";
import ProductionShipmentsPage from "./pages/production/ProductionShipmentsPage.jsx";

// Admin
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminProductsPage from "./pages/admin/AdminProductsPage.jsx";
import AdminEmployeesPage from "./pages/admin/AdminEmployeesPage.jsx";

import DownloadPage from "./pages/misc/DownloadPage.jsx";
import RoleLandingRedirect from "./components/auth/RoleLandingRedirect.jsx";

import NotFoundPage from "./pages/NotFoundPage.jsx";

export const router = createBrowserRouter([
  // Auth (hors layout)
  { path: "/login", element: <LoginPage /> },
  { path: "/change-password", element: <ChangePasswordPage /> },

  // AppLayout (protégé)
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <RoleLandingRedirect /> },

      { path: "/telechargement", element: <DownloadPage /> },

      {
        path: "/bureau",
        children: [
          { index: true, element: <DashboardBureauPage /> },
          { path: "commandes", element: <OrdersPage /> },
          { path: "expeditions", element: <ShipmentsPage /> },
          { path: "import", element: <ImportPdfPage /> },
          { path: "historique", element: <HistoryPage /> },
        ],
      },

      {
        path: "/production",
        children: [
          { index: true, element: <DashboardProductionPage /> },
          { path: "commandes", element: <ProductionOrdersPage /> },
          { path: "expeditions", element: <ProductionShipmentsPage /> },
        ],
      },

      {
        path: "/admin",
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "produits", element: <AdminProductsPage /> },
          { path: "employes", element: <AdminEmployeesPage /> },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
