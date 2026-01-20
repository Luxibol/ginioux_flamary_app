/**
 * Page — Bureau Historique
 * - Wrapper SEO + rendu de l'historique des commandes
 */
import Seo from "../../components/seo/Seo.jsx";
import HistoryBureau from "../../features/bureau/pages/HistoryBureau.jsx";

/**
 * Wrapper de page Bureau Historique (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function HistoryPage() {
  return (
    <>
      <Seo
        title="Historique — Bureau — Ginioux Flamary"
        description="Historique des commandes expédiées."
        canonical="/bureau/historique"
      />
      <HistoryBureau />
    </>
  );
}
