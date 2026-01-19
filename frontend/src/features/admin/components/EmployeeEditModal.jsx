import { ROLES } from "../utils/adminEmployees.utils.js";

export default function EmployeeEditModal({
  open,
  loading,
  error,
  // form
  eFirstName,
  setEFirstName,
  eLastName,
  setELastName,
  eLogin,
  setELogin,
  eRole,
  setERole,
  eActive,
  setEActive,
  // meta
  titleLine,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">Modifier un employé</div>
          {titleLine ? (
            <div className="text-xs text-gf-subtitle mt-1 truncate">{titleLine}</div>
          ) : null}
        </div>

        <div className="p-5">
          {error ? <div className="mb-3 text-xs text-gf-danger">{error}</div> : null}

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <div className="text-xs text-gf-subtitle mb-1">Nom</div>
              <input
                value={eLastName}
                onChange={(e) => setELastName(e.target.value)}
                className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              />
            </div>

            <div className="col-span-6">
              <div className="text-xs text-gf-subtitle mb-1">Prénom</div>
              <input
                value={eFirstName}
                onChange={(e) => setEFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              />
            </div>

            <div className="col-span-6">
              <div className="text-xs text-gf-subtitle mb-1">Identifiant</div>
              <input
                value={eLogin}
                onChange={(e) => setELogin(e.target.value)}
                className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              />
            </div>

            <div className="col-span-4">
              <div className="text-xs text-gf-subtitle mb-1">Rôle</div>
              <select
                value={eRole}
                onChange={(e) => setERole(e.target.value)}
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
                value={eActive ? "1" : "0"}
                onChange={(e) => setEActive(e.target.value === "1")}
                className="h-9 w-full rounded-md border border-gf-border bg-gf-bg px-3 text-xs outline-none focus:border-gf-orange"
              >
                <option value="1">Oui</option>
                <option value="0">Non</option>
              </select>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
