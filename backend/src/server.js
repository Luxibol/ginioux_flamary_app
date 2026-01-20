/**
 * @file backend/src/server.js
 * @description Point d'entrée HTTP : charge .env et démarre l'API Express.
 */
require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
