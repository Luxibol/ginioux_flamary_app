/**
 * Page — Bureau Expéditions
 * - Wrapper SEO + rendu de la page Expéditions (Bureau)
 */
import Seo from "../../components/seo/Seo.jsx";
import ShipmentsBureau from "../../features/bureau/pages/ShipmentsBureau.jsx";

/**
 * Wrapper de page Bureau Expéditions (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function ShipmentsPage() {
  return (
    <>
      <Seo
        title="Expéditions — Bureau — Ginioux Flamary"
        description="Expéditions côté Bureau : réception et suivi des départs."
        canonical="/bureau/expeditions"
      />
      <ShipmentsBureau />
    </>
  );
}
