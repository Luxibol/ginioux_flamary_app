/**
 * @file backend/src/realtime/productionEvents.js
 * @description Hub SSE en mémoire : registre des clients + diffusion d'événements Production.
 */

// Hub en mémoire (process) : reset au redéploiement / restart (acceptable pour un intranet).
const clients = new Set();

/**
 * Ajoute une connexion SSE (Response) au hub.
 * Le client est retiré automatiquement à la fermeture de la connexion.
 * @param {import("express").Response} res
 */
function addClient(res) {
  const client = { res };
  clients.add(client);

  res.on("close", () => {
    clients.delete(client);
  });
}

/**
 * Broadcast un event à tous les clients connectés.
 * Diffuse un event SSE nommé "production" (EventSource côté front).
 * @param {{ type: string, [key: string]: any }} payload - Données sérialisées dans l'event "production".
 */
function broadcastProductionEvent(payload) {
  const msg = `event: production\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try {
      c.res.write(msg);
    } catch {
      clients.delete(c);
    }
  }
}

module.exports = { addClient, broadcastProductionEvent };
