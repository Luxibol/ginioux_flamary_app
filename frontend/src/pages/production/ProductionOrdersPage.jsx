import Seo from "../../components/seo/Seo.jsx";
import Orders from "../../features/production/pages/Orders.jsx";

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
