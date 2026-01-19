import Seo from "../../components/seo/Seo.jsx";
import HistoryBureau from "../../features/bureau/pages/HistoryBureau.jsx";

export default function HistoryPage() {
  return (
    <>
      <Seo
        title="Historique — Bureau — Ginioux Flamary"
        description="Historique des commandes expédiées."
        canonical="/bureau/historique"
      />
      <HistoryBureau />
    </>
  );
}
