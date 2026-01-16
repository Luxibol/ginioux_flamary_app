const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Token manquant." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "JWT_SECRET manquant." });

    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide." });
  }
}

module.exports = { requireAuth };
