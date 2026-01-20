/**
 * @file backend/src/middlewares/rbac.middleware.js
 * @description Middleware RBAC : autorise l'accès uniquement aux rôles spécifiés.
 */

/**
 * Construit un middleware qui autorise uniquement certains rôles.
 * @param {...string} roles
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: "Non authentifié." });

    if (!roles.includes(role)) {
      return res.status(403).json({ error: "Accès interdit." });
    }

    return next();
  };
}

module.exports = { requireRole };
