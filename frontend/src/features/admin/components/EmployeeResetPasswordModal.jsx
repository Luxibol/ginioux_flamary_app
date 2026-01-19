function copyToClipboard(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // noop
  }
}

export default function EmployeeResetPasswordModal({
  open,
  loading,
  error,
  titleLine,
  tempPassword,
  onClose,
  onCopy,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gf-border bg-gf-surface shadow-sm">
        <div className="p-5 border-b border-gf-border">
          <div className="text-sm font-semibold text-gf-title">Réinitialiser le mot de passe</div>
          <div className="text-xs text-gf-subtitle mt-1">{titleLine}</div>
        </div>

        <div className="p-5">
          {error ? <div className="mb-3 text-xs text-gf-danger">{error}</div> : null}

          <div className="text-xs text-gf-subtitle">
            Un mot de passe temporaire est généré. L’employé devra le changer à la première connexion.
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-10 rounded-md border border-gf-border bg-gf-bg px-3 flex items-center text-xs font-mono">
              {tempPassword || (loading ? "Génération…" : "—")}
            </div>
            <button
              type="button"
              disabled={!tempPassword}
              onClick={() => {
                copyToClipboard(tempPassword);
                onCopy?.();
              }}
              className="gf-btn h-10 px-4 text-xs"
            >
              Copier
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-gf-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="gf-btn gf-btn-primary h-9 px-6 text-xs"
            disabled={loading}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
