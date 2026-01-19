import Seo from "../../components/seo/Seo.jsx";
import Dashboard from "../../features/production/pages/Dashboard.jsx";

export default function DashboardProductionPage() {
  return (
    <>
      <Seo
        title="Dashboard Production — Ginioux Flamary"
        description="Tableau de bord Production : commandes à produire et expéditions à charger."
        canonical="/production"
      />
      <Dashboard />
    </>
  );
}
