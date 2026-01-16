import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/pictures/logo.png";
import { changePassword } from "../../services/auth.api.js";
import { getAuth, setAuth } from "../../services/auth.storage.js";

function landingPathForRole(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "BUREAU") return "/bureau";
  if (role === "PRODUCTION") return "/production/commandes";
  return "/bureau";
}

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

      // met à jour le user en storage (must_change_password = false)
      if (auth?.token && auth?.user) {
        setAuth(
          { token: auth.token, user: { ...auth.user, must_change_password: false } },
          { persist: "local" } // ou session, mais on ne sait pas ici; on garde local (simple)
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
    <div className="min-h-dvh bg-gf-bg text-gf-text flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gf-border bg-gf-surface shadow-sm p-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Ginioux Flamary" className="h-12 w-auto" />
          <div className="text-sm font-semibold text-gf-title">Nouveau mot de passe</div>
          <div className="text-xs text-gf-subtitle text-center">
            Vous devez changer votre mot de passe temporaire.
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? <div className="text-xs text-gf-danger">{error}</div> : null}

          <div>
            <div className="text-xs text-gf-subtitle mb-1">Nouveau mot de passe</div>
            <input
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              type="password"
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
            />
          </div>

          <div>
            <div className="text-xs text-gf-subtitle mb-1">Confirmer le mot de passe</div>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              type="password"
              className="h-10 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              placeholder="Confirmer le mot de passe"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-10 w-full rounded-md bg-gf-orange text-white text-xs font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Validation…" : "Valider"}
          </button>

          <div className="text-[11px] text-gf-subtitle text-center">
            Après validation, vous serez connecté à l’application.
          </div>
        </form>
      </div>
    </div>
  );
}
