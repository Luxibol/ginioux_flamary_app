/**
 * Page — Changement de mot de passe
 * - Formulaire de définition d'un nouveau mot de passe
 * - Met à jour la session (must_change_password=false)
 * - Redirection vers la zone correspondant au rôle
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/pictures/logo.png";
import { changePassword } from "../../services/auth.api.js";
import { getAuth, setAuth } from "../../services/auth.storage.js";
import { landingPathForRole } from "../../utils/roleRouting.js";
import AuthLayout from "../../components/auth/AuthLayout.jsx";
import Seo from "../../components/seo/Seo.jsx";

/**
 * Page de changement de mot de passe (obligatoire au premier login).
 * @returns {import("react").JSX.Element}
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return p1.length >= 6 && p1 === p2 && !loading;
  }, [p1, p2, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      await changePassword({ new_password: p1 });

      // Met à jour la session locale (must_change_password=false)
      if (auth?.token && auth?.user) {
        setAuth(
          {
            token: auth.token,
            user: { ...auth.user, must_change_password: false },
          },
          { persist: "local" },
        );
      }

      navigate(landingPathForRole(auth?.user?.role), { replace: true });
    } catch (err) {
      setError(err?.message || "Impossible de changer le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Seo
        title="Nouveau mot de passe — Ginioux Flamary"
        description="Définissez votre nouveau mot de passe pour accéder à l’application."
        canonical="/change-password"
      />

      <div className="w-full max-w-md gf-card gf-card-pad shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Ginioux Flamary" className="h-12 w-auto" />
          <h1 className="gf-h1">Nouveau mot de passe</h1>
          <p className="text-xs text-gf-subtitle text-center">
            Vous devez changer votre mot de passe temporaire.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="gf-error" role="alert">
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="new_password"
              className="text-xs text-gf-subtitle mb-1 block"
            >
              Nouveau mot de passe
            </label>
            <input
              id="new_password"
              name="new_password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              type="password"
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Au moins 8 caractères"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label
              htmlFor="new_password_confirm"
              className="text-xs text-gf-subtitle mb-1 block"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="new_password_confirm"
              name="new_password_confirm"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              type="password"
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Confirmer le mot de passe"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="gf-btn gf-btn-primary w-full"
          >
            {loading ? "Validation…" : "Valider"}
          </button>

          <div className="text-[11px] text-gf-subtitle text-center">
            Après validation, vous serez connecté à l’application.
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
