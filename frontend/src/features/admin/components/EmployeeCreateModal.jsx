import { ROLES } from "../utils/adminEmployees.utils.js";

function copyToClipboard(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // noop
  }
}

export default function EmployeeCreateModal({
  open,
  loading,
  error,
  // form
  fFirstName,
  setFFirstName,
  fLastName,
  setFLastName,
  fLogin,
  setFLogin,
  fRole,
  setFRole,
  fActive,
  setFActive,
  // result
  createdTempPassword,
  onClearTempPassword,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const showTemp = Boolean(createdTempPassword);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">Ajouter un employé</div>
          <div className="text-xs text-gf-subtitle mt-1">
            Nom + prénom + rôle. Identifiant optionnel (sinon auto).
          </div>
        </div>

        <div className="p-5">
          {error ? <div className="mb-3 text-xs text-gf-danger">{error}</div> : null}

          {showTemp ? (
            <div className="rounded-xl border border-gf-border bg-gf-bg p-4">
              <div className="text-xs font-semibold text-gf-title">Mot de passe temporaire</div>
              <div className="text-xs text-gf-subtitle mt-1">
                À transmettre à l’employé. Changement obligatoire à la première connexion.
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-10 rounded-md border border-gf-border bg-gf-surface px-3 flex items-center text-xs font-mono">
                  {createdTempPassword}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdTempPassword)}
                  className="gf-btn h-10 px-4 text-xs"
                >
                  Copier
                </button>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClearTempPassword?.();
                    onClose();
                  }}
                  className="gf-btn gf-btn-primary h-9 px-6 text-xs"
                >
                  Terminer
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <div className="text-xs text-gf-subtitle mb-1">Nom</div>
                <input
                  value={fLastName}
                  onChange={(e) => setFLastName(e.target.value)}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
                  placeholder="DUPONT"
                />
              </div>

              <div className="col-span-6">
                <div className="text-xs text-gf-subtitle mb-1">Prénom</div>
                <input
                  value={fFirstName}
                  onChange={(e) => setFFirstName(e.target.value)}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
                  placeholder="Jean"
                />
              </div>

              <div className="col-span-6">
                <div className="text-xs text-gf-subtitle mb-1">Identifiant (optionnel)</div>
                <input
                  value={fLogin}
                  onChange={(e) => setFLogin(e.target.value)}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
                  placeholder="dupontj"
                />
              </div>

              <div className="col-span-4">
                <div className="text-xs text-gf-subtitle mb-1">Rôle</div>
                <select
                  value={fRole}
                  onChange={(e) => setFRole(e.target.value)}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
                >
                  {ROLES.filter((r) => r.value).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <div className="text-xs text-gf-subtitle mb-1">Actif</div>
                <select
                  value={fActive ? "1" : "0"}
                  onChange={(e) => setFActive(e.target.value === "1")}
                  className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
                >
                  <option value="1">Oui</option>
                  <option value="0">Non</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {!showTemp ? (
          <div className="p-5 border-t border-gf-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="gf-btn h-9 px-5 text-xs"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="gf-btn gf-btn-primary h-9 px-6 text-xs"
              disabled={loading}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
