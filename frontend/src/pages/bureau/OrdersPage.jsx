import Seo from "../../components/seo/Seo.jsx";
import Orders from "../../features/bureau/pages/Orders.jsx";

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
