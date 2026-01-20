/**
 * Layout — Auth
 * - Affiche un fond (desktop) + centre le contenu (formulaires)
 */
import banner from "../../assets/pictures/banerlog.png";

/**
 * Layout des pages d'authentification.
 * @param {object} props
 * @param {import("react").ReactNode} props.children Contenu (formulaires)
 * @returns {import("react").JSX.Element}
 */
export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-dvh bg-gf-bg text-gf-text overflow-hidden">
      {/* Fond desktop */}
      <div
        className="hidden lg:block absolute inset-0"
        style={{
          backgroundImage: `url(${banner})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% auto",
          backgroundPosition: "center",
        }}
      />

      {/* Contenu centré */}
      <div className="relative min-h-dvh flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
