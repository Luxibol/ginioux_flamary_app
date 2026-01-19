import Seo from "../../components/seo/Seo.jsx";
import DashboardBureau from "../../features/bureau/pages/Dashboard.jsx";

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
