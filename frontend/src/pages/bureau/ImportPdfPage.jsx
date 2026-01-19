import Seo from "../../components/seo/Seo.jsx";
import ImportPdf from "../../features/bureau/pages/ImportPdf.jsx";

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
