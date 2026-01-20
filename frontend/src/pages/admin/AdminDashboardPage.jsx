/**
 * Page — Admin Dashboard
 * - Wrapper SEO + rendu de la page Dashboard
 */
import Seo from "../../components/seo/Seo.jsx";
import AdminDashboard from "../../features/admin/pages/Dashboard.jsx";

/**
 * Wrapper de page Admin (SEO).
 * @returns {import("react").JSX.Element}
 */
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
