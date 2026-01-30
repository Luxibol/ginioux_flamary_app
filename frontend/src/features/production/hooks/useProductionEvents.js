import { useEffect, useRef } from "react";
import { apiUrl } from "../../../services/apiClient.js";
import { getToken, setToken } from "../../../services/auth.storage.js";

/**
 * SSE Production:
 * - écoute /events/production?access_token=...
 * - si auth_error => tente /auth/refresh (cookie httpOnly) puis reconnect
 */

// ✅ shared state (persistant entre renders / montages)
let sharedES = null;
let sharedRefCount = 0;
let sharedReconnectTimer = null;
let sharedBackoffMs = 1000;

export function useProductionEvents(onEvent) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const refreshInFlightRef = useRef(false);

  async function tryRefresh() {
    if (refreshInFlightRef.current) return null;
    refreshInFlightRef.current = true;
    try {
      const res = await fetch(apiUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
      if (data?.token) setToken(data.token);
      return data?.token || null;
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  useEffect(() => {
    sharedRefCount += 1;

    let stopped = false;

    const closeShared = () => {
      if (sharedReconnectTimer) {
        clearTimeout(sharedReconnectTimer);
        sharedReconnectTimer = null;
      }
      if (sharedES) {
        try {
          sharedES.close();
        } catch {
          // ignore
        }
        sharedES = null;
      }
    };

    const scheduleReconnect = (fn) => {
      if (stopped) return;
      if (sharedReconnectTimer) return;

      sharedReconnectTimer = setTimeout(() => {
        sharedReconnectTimer = null;
        fn();
      }, sharedBackoffMs);

      // backoff progressif jusqu'à 30s
      sharedBackoffMs = Math.min(sharedBackoffMs * 2, 30000);
    };

    const connect = () => {
      // si déjà connecté, ne pas recréer
      if (sharedES) return;

      const token = getToken() || "";
      const url = apiUrl(
        `/events/production?access_token=${encodeURIComponent(token)}`,
      );

      const es = new EventSource(url);
      sharedES = es;

      es.addEventListener("ready", () => {
        // connexion OK => on reset le backoff
        sharedBackoffMs = 1000;
      });

      es.addEventListener("production", (e) => {
        try {
          const payload = JSON.parse(e.data || "{}");
          onEventRef.current?.(payload);
        } catch {
          // ignore (payload invalide)
        }
      });

      es.addEventListener("auth_error", async () => {
        closeShared();
        await tryRefresh();
        scheduleReconnect(connect);
      });

      es.onerror = () => {
        // si erreur réseau => on ferme et on reconnect avec backoff
        closeShared();
        scheduleReconnect(connect);
      };
    };

    connect();

    return () => {
      stopped = true;
      sharedRefCount -= 1;

      // on ferme vraiment quand plus personne n'utilise le SSE (Orders/Shipments)
      if (sharedRefCount <= 0) {
        closeShared();
        sharedRefCount = 0;
        sharedBackoffMs = 1000;
      }
    };
  }, []);
}
