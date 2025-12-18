import logo from "../../assets/pictures/logo.png";
import { Power } from "lucide-react";

function Header() {
  return (
    <header className="h-16 flex items-center justify-between pl-6 pr-4 border-b border-gf-border bg-gf-surface">
      <div className="flex items-center">
        <img
          src={logo}
          alt="Ginioux Flamary"
          className="h-14 w-auto"
        />
      </div>

      <div className="flex items-center pr-6 gap-2 text-xs">
        <span className="text-gf-text whitespace-nowrap">Mathieu - Bureau</span>
        <span className="text-gf-text"> | </span>
        <button className="inline-flex items-center gap-2 whitespace-nowrap text-gf-orange hover:underline">
          Se déconnecter
          <Power className="h-5 w-5 shrink-0" />
        </button>
      </div>
    </header>
  );
}

export default Header;
