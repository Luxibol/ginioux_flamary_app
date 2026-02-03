/**
 * @file frontend/src/components/pwa/PwaUpdateToast.jsx
 * @description Toast PWA : propose un rechargement quand une nouvelle version est disponible.
 */
import { useMemo, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export default function PwaUpdateToast() {
  const [open, setOpen] = useState(false);

  const updateSW = useMemo(() => {
    return registerSW({
      onNeedRefresh() {
        setOpen(true);
      },
      onOfflineReady() {
        // volontairement silencieux (offline minimal)
      },
    });
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed left-4 right-4 bottom-4 z-[9999] rounded-2xl border border-white/15 bg-black/90 px-4 py-3 text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          Nouvelle version disponible.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="gf-btn text-xs"
            onClick={() => setOpen(false)}
          >
            Plus tard
          </button>

          <button
            type="button"
            className="gf-btn gf-btn-primary text-xs"
            // Active le nouveau service worker puis recharge la page.
            onClick={() => updateSW(true)}
          >
            Recharger
          </button>
        </div>
      </div>
    </div>
  );
}
