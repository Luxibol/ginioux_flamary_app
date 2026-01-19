import Seo from "../../components/seo/Seo.jsx";
import AdminProducts from "../../features/admin/pages/AdminProducts.jsx";

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
