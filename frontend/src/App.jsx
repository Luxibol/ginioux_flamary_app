/**
 * @file frontend/src/App.jsx
 * @description Root React : monte le Router + le toast PWA (update).
 */
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import PwaUpdateToast from "./components/pwa/PwaUpdateToast.jsx";

/**
 * App (root).
 * @returns {import("react").JSX.Element}
 */
export default function App() {
  return (
    <>
      <PwaUpdateToast />
      <RouterProvider router={router} />
    </>
  );
}
