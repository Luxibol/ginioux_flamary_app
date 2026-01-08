/**
 * Point d’entrée React.
 * Monte l’application dans <div id="root"> et active StrictMode en développement.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Rendu racine de l'app dans le DOM.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
