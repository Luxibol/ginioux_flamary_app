/**
 * Page — Bureau Dashboard
 * - Wrapper SEO + rendu du tableau de bord Bureau
 */
import Seo from "../../components/seo/Seo.jsx";
import DashboardBureau from "../../features/bureau/pages/Dashboard.jsx";

/**
 * Wrapper de page Bureau (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function DashboardBureauPage() {
  return (
    <>
      <Seo
        title="Dashboard Bureau — Ginioux Flamary"
        description="Tableau de bord Bureau : commandes, urgences et expéditions à traiter."
        canonical="/bureau"
      />
      <DashboardBureau />
    </>
  );
}
