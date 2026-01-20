/**
 * Page — Connexion
 * - Formulaire de login + persistance (local/session)
 * - Redirection selon rôle ou changement de mot de passe requis
 * - Modale "mot de passe oublié" (info)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/pictures/logo.png";
import { login as loginApi } from "../../services/auth.api.js";
import { setAuth } from "../../services/auth.storage.js";
import { landingPathForRole } from "../../utils/roleRouting.js";
import AuthLayout from "../../components/auth/AuthLayout.jsx";
import Seo from "../../components/seo/Seo.jsx";

/**
 * Modale d'information "mot de passe oublié".
 * @param {object} props
 * @param {boolean} props.open Affiche/masque la modale
 * @param {()=>void} props.onClose Fermeture
 * @returns {import("react").JSX.Element|null}
 */
function ForgotPasswordModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mot de passe oublié"
    >
      <div className="w-full max-w-md rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">
            Mot de passe oublié
          </div>
          <div className="text-xs text-gf-subtitle mt-2">
            Contactez votre administrateur pour réinitialiser votre mot de passe.
          </div>
        </div>
        <div className="p-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="gf-btn"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Page de connexion.
 * @returns {import("react").JSX.Element}
 */
export default function LoginPage() {
  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openForgot, setOpenForgot] = useState(false);

  const canSubmit = useMemo(() => {
    return login.trim().length > 0 && password.length > 0 && !loading;
  }, [login, password, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const res = await loginApi({
        login: login.trim().toLowerCase(),
        password,
      });

      // Stocke la session (token + user) en localStorage ou sessionStorage
      setAuth(
        { token: res.token, user: res.user },
        { persist: remember ? "local" : "session" }
      );

      if (res.user?.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate(landingPathForRole(res.user?.role), { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Seo
        title="Connexion — Ginioux Flamary"
        description="Connexion à l’application interne Ginioux Flamary."
        canonical="/login"
      />

      <div className="w-full max-w-md gf-card gf-card-pad shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Ginioux Flamary" className="h-12 w-auto" />
          <h1 className="gf-h1">Connexion</h1>
          <p className="text-xs text-gf-subtitle text-center">
            Accès réservé au personnel de Ginioux Flamary.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="gf-error" role="alert">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="login" className="text-xs text-gf-subtitle mb-1 block">
              Identifiant
            </label>
            <input
              id="login"
              name="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Identifiant"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-xs text-gf-subtitle mb-1 block"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Mot de passe"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-gf-subtitle select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Se souvenir de moi
            </label>

            <button
              type="button"
              className="text-xs text-gf-orange hover:underline"
              onClick={() => setOpenForgot(true)}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="gf-btn gf-btn-primary w-full"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>

      <ForgotPasswordModal open={openForgot} onClose={() => setOpenForgot(false)} />
    </AuthLayout>
  );
}
