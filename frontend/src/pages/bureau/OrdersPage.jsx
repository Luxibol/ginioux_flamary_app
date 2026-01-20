/**
 * Page — Bureau Commandes en cours
 * - Wrapper SEO + rendu de la liste des commandes actives
 */
import Seo from "../../components/seo/Seo.jsx";
import Orders from "../../features/bureau/pages/Orders.jsx";

/**
 * Wrapper de page Bureau Commandes (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function OrdersPage() {
  return (
    <>
      <Seo
        title="Commandes en cours — Bureau — Ginioux Flamary"
        description="Liste des commandes actives côté Bureau."
        canonical="/bureau/commandes"
      />
      <Orders />
    </>
  );
}
