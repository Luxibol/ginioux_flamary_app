/**
 * Page — 404
 * - Affiche une page introuvable avec liens de retour
 * - Définit le SEO (title/description/canonical)
 */
import { Link } from "react-router-dom";
import Seo from "../components/seo/Seo.jsx";

/**
 * Page 404 (Not Found).
 * @returns {import("react").JSX.Element}
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gf-bg p-6">
      <Seo
        title="Page introuvable — Ginioux Flamary"
        description="Cette page n’existe pas."
        canonical="/404"
      />

      <div className="mx-auto max-w-xl rounded-2xl border border-gf-border bg-gf-surface p-6 shadow-sm">
        <h1 className="gf-h1">Page introuvable</h1>
        <p className="mt-2 text-xs text-gf-subtitle">
          Le lien est peut-être incorrect ou la page a été déplacée.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex h-9 items-center rounded-md bg-gf-orange px-4 text-xs font-medium text-white hover:opacity-90"
          >
            Revenir au Tableau de bord
          </Link>
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-md border border-gf-border bg-gf-bg px-4 text-xs hover:opacity-90"
          >
            Connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
