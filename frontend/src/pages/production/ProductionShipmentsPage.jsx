/**
 * Page — Production Expéditions
 * - Wrapper SEO + rendu de la page Expéditions à charger
 */
import Seo from "../../components/seo/Seo.jsx";
import Shipments from "../../features/production/pages/Shipments.jsx";

/**
 * Wrapper de page Production Expéditions (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function ProductionShipmentsPage() {
  return (
    <>
      <Seo
        title="Expéditions à charger — Production — Ginioux Flamary"
        description="Expéditions à charger (Production) : chargement et départ camion."
        canonical="/production/expeditions"
      />
      <Shipments />
    </>
  );
}
