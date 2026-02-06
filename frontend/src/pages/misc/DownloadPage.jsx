/**
 * @file frontend/src/pages/misc/DownloadPage.jsx
 * @description Page cachée d’installation PWA (/telechargement) : propose l’installation ou les instructions.
 */
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "../../services/auth.storage.js";
import { useNavigate } from "react-router-dom";

/**
 * Page "Téléchargement" (PWA install)
 * - Cachée (pas dans le menu)
 * - Utile pour guider l'install Android / iOS
 * - Ici elle est déjà protégée par RequireAuth (route dans AppLayout)
 */
export default function DownloadPage() {
  const auth = useMemo(() => getAuth(), []);
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  const navigate = useNavigate();

  const isIOS = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    const isApple = /iPad|iPhone|iPod/.test(ua);
    const isWebkit = /WebKit/.test(ua);
    return isApple && isWebkit;
  }, []);

  useEffect(() => {
    // Détection "déjà installée"
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const checkInstalled = () => {
      const standalone = mql?.matches === true;
      // iOS standalone
      const iosStandalone = window.navigator.standalone === true;
      setInstalled(Boolean(standalone || iosStandalone));
    };

    checkInstalled();
    mql?.addEventListener?.("change", checkInstalled);
    return () => mql?.removeEventListener?.("change", checkInstalled);
  }, []);

  useEffect(() => {
    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    // Android/Chrome : capture l’événement d’installation (si dispo).
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const onInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="gf-h1">Installer l’application</div>
        <div className="gf-body">
          Accès interne — page non listée dans le menu.
        </div>
      </div>

      <div className="gf-card gf-card-pad space-y-3">
        <div className="text-sm">
          Connecté en tant que{" "}
          <span className="font-semibold">
            {auth?.user?.first_name || "—"} ({auth?.user?.role || "—"})
          </span>
        </div>

        {installed ? (
          <div className="text-sm">
            ✅ L’application semble déjà installée.
          </div>
        ) : (
          <>
            {deferred ? (
              <button
                type="button"
                className="gf-btn gf-btn-primary"
                onClick={onInstall}
              >
                Installer
              </button>
            ) : (
              <div className="text-sm text-gf-subtitle">
                <div className="font-semibold text-gf-title">Installation</div>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <span className="font-semibold">Android (Chrome)</span> :
                    menu ⋮ → <span className="font-semibold">Installer l’application</span>
                  </li>
                  <li>
                    <span className="font-semibold">iPhone (Safari)</span> :
                    bouton <span className="font-semibold">Partager</span> →{" "}
                    <span className="font-semibold">Sur l’écran d’accueil</span>
                  </li>
                </ul>
                {isIOS ? (
                  <div className="mt-2 text-xs">
                    Note : iOS n’affiche pas toujours un bouton “Installer” automatique.
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex justify-center">      
        <button
          type="button"
          className="gf-btn gf-btn-primary"
          onClick={() => navigate("/")}
        >
          Aller au tableau de bord
        </button>
      </div>
    </div>
  );
}
