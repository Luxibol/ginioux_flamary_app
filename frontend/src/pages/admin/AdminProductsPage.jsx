/**
 * Page — Admin Produits
 * - Wrapper SEO + rendu de la page de gestion des produits
 */
import Seo from "../../components/seo/Seo.jsx";
import AdminProducts from "../../features/admin/pages/AdminProducts.jsx";

/**
 * Wrapper de page Admin Produits (SEO).
 * @returns {import("react").JSX.Element}
 */
export default function AdminProductsPage() {
  return (
    <>
      <Seo
        title="Gestion des produits — Admin — Ginioux Flamary"
        description="Administration : création, modification et suppression des produits."
        canonical="/admin/produits"
      />
      <AdminProducts />
    </>
  );
}
