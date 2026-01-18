const jwt = require("jsonwebtoken");

const ALLOWED_ROLES = new Set(["ADMIN", "BUREAU", "PRODUCTION"]);

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

    const userId = payload?.sub;
    const role = payload?.role;

    if (!userId || !ALLOWED_ROLES.has(role)) {
      return res.status(401).json({ error: "Token invalide." });
    }

    req.user = { id: userId, role };

    return next();
  } catch (e) {
    if (e?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expiré." });
    }
    return res.status(401).json({ error: "Token invalide." });
  }
}

module.exports = { requireAuth };
