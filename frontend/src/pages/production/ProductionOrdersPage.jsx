/**
 * Page — Production Commandes
 * - Wrapper SEO + rendu de la liste des commandes à produire
 */
import Seo from "../../components/seo/Seo.jsx";
import Orders from "../../features/production/pages/Orders.jsx";

/**
 * Wrapper de page Production Commandes (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function ProductionOrdersPage() {
  return (
    <>
      <Seo
        title="Commandes à produire — Production — Ginioux Flamary"
        description="Liste des commandes à produire (Production)."
        canonical="/production/commandes"
      />
      <Orders />
    </>
  );
}
