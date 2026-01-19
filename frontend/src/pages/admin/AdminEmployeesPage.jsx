import Seo from "../../components/seo/Seo.jsx";
import AdminEmployees from "../../features/admin/pages/AdminEmployees.jsx";

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
