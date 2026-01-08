/**
 * Point d'entrée du serveur HTTP.
 * Charge la config .env, instancie l'app Express et démarre l'écoute.
 */
require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
