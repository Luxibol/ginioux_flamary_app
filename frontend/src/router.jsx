import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";

import Dashboard from "./pages/bureau/Dashboard.jsx";
import Orders from "./pages/bureau/Orders.jsx";
import Shipments from "./pages/bureau/Shipments.jsx";
import ImportPdf from "./pages/bureau/ImportPdf.jsx";
import History from "./pages/bureau/History.jsx";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/bureau" replace /> },

      {
        path: "/bureau",
        children: [
          { index: true, element: <Dashboard /> },
          { path: "commandes", element: <Orders /> },
          { path: "expeditions", element: <Shipments /> },
          { path: "import", element: <ImportPdf /> },
          { path: "historique", element: <History /> },
        ],
      },
    ],
  },
]);
