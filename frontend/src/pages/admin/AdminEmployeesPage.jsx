/**
 * Page — Admin Employés
 * - Wrapper SEO + rendu de la page de gestion des employés
 */
import Seo from "../../components/seo/Seo.jsx";
import AdminEmployees from "../../features/admin/pages/AdminEmployees.jsx";

/**
 * Wrapper de page Admin Employés (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function AdminEmployeesPage() {
  return (
    <>
      <Seo
        title="Gestion des employés — Admin — Ginioux Flamary"
        description="Administration : gestion des comptes employés et réinitialisation des mots de passe."
        canonical="/admin/employes"
      />
      <AdminEmployees />
    </>
  );
}
