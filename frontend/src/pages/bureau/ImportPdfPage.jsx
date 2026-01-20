/**
 * Page — Bureau Import PDF
 * - Wrapper SEO + rendu de l'écran d'import PDF
 */
import Seo from "../../components/seo/Seo.jsx";
import ImportPdf from "../../features/bureau/pages/ImportPdf.jsx";

/**
 * Wrapper de page Bureau Import PDF (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function ImportPdfPage() {
  return (
    <>
      <Seo
        title="Import PDF — Bureau — Ginioux Flamary"
        description="Importez un PDF de bon/commande pour créer ou mettre à jour une commande."
        canonical="/bureau/import"
      />
      <ImportPdf />
    </>
  );
}
