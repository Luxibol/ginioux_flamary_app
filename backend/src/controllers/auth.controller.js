const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usersRepo = require("../repositories/users.repository");

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans .env");

  // payload minimal
  return jwt.sign({ sub: user.id, role: user.role }, secret, {
    expiresIn: "7d",
  });
}

async function login(req, res) {
  try {
    const loginInput = String(req.body.login || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!loginInput || !password) {
      return res
        .status(400)
        .json({ error: "Login et mot de passe obligatoires." });
    }

    const user = await usersRepo.findByLogin(loginInput);
    if (!user)
      return res.status(401).json({ error: "Identifiants invalides." });
    if (!user.is_active)
      return res.status(403).json({ error: "Compte désactivé." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Identifiants invalides." });

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login,
        role: user.role,
        must_change_password: Boolean(user.must_change_password),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

async function changePassword(req, res) {
  try {
    // req.user injecté par auth middleware
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Non authentifié." });

    const newPassword = String(req.body.new_password || "");
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Mot de passe trop court (min 6 caractères)." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const ok = await usersRepo.updatePassword(userId, hash, 0);
    if (!ok) return res.status(404).json({ error: "Utilisateur introuvable." });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

module.exports = { login, changePassword };
