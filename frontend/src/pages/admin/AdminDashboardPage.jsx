import Seo from "../../components/seo/Seo.jsx";
import AdminDashboard from "../../features/admin/pages/Dashboard.jsx";

export default function AdminDashboardPage() {
  return (
    <>
      <Seo
        title="Dashboard Admin — Ginioux Flamary"
        description="Tableau de bord Administrateur : KPI, urgences et activité."
        canonical="/admin"
      />
      <AdminDashboard />
    </>
  );
}
