/**
 * Déclaration des routes de l'application (React Router v6).
 * - AppLayout : layout commun (Bureau desktop / Production mobile selon la route)
 * - /bureau/* : espace "Bureau"
 * - /production/* : espace "Production" (mobile)
 * - Redirect / -> /bureau (en attendant l’auth)
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";

import DashboardBureauPage from "./pages/bureau/DashboardBureauPage.jsx";
import OrdersPage from "./pages/bureau/OrdersPage.jsx";
import ShipmentsPage from "./pages/bureau/ShipmentsPage.jsx";
import ImportPdfPage from "./pages/bureau/ImportPdfPage.jsx";
import HistoryPage from "./pages/bureau/HistoryPage.jsx";

import DashboardProductionPage from "./pages/production/DashboardProductionPage.jsx";
import ProductionOrdersPage from "./pages/production/ProductionOrdersPage.jsx";
import ProductionShipmentsPage from "./pages/production/ProductionShipmentsPage.jsx";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminProductsPage from "./pages/admin/AdminProductsPage.jsx";
import AdminEmployeesPage from "./pages/admin/AdminEmployeesPage.jsx";


export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // Redirection racine -> /bureau (page par défaut en attendant l’auth)
      { index: true, element: <Navigate to="/bureau" replace /> },

      {
        path: "/bureau",
        children: [
          { index: true, element: <DashboardBureauPage /> },
          { path: "commandes", element: <OrdersPage /> },
          { path: "expeditions", element: <ShipmentsPage /> },
          { path: "import", element: <ImportPdfPage /> },
          { path: "historique", element: <HistoryPage /> },
          { path: "admin/produits", element: <AdminProductsPage /> },
          { path: "admin/employes", element: <AdminEmployeesPage /> },
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
          { path: "gestion", element: <AdminManagementPage /> },
        ],
      },
    ],
  },
]);
