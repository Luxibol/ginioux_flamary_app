import Seo from "../../components/seo/Seo.jsx";
import ShipmentsBureau from "../../features/bureau/pages/ShipmentsBureau.jsx";

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
