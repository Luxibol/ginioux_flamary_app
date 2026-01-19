import Seo from "../../components/seo/Seo.jsx";
import Shipments from "../../features/production/pages/Shipments.jsx";

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
