// backend/src/realtime/productionEvents.js
const clients = new Set();

/**
 * Ajoute une connexion SSE (Response) au hub.
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
 * @param {object} payload
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
