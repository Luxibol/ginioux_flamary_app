/**
 * Point d’entrée React de l’app :
 * branche le router (défini dans router.jsx) via <RouterProvider />.
 */
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";

export default function App() {
  return <RouterProvider router={router} />;
}
