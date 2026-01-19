const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usersRepo = require("../repositories/users.repository");

const crypto = require("crypto");

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 30;

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans .env");

  return jwt.sign({ sub: user.id, role: user.role }, secret, {
    expiresIn: ACCESS_TTL,
  });
}

function newRefreshToken() {
  // token opaque (pas un JWT)
  return crypto.randomBytes(64).toString("hex"); // 128 chars
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function refreshExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/", //  un seul path maintenant
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function clearRefreshCookie(res) {
  // on nettoie les 2 paths possibles (ancien + nouveau)
  res.clearCookie("refresh_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
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

    const refreshRepo = require("../repositories/refreshTokens.repository");

    // 1) Révoque d'abord (pour éviter l'accumulation)
    await refreshRepo.revokeAllForUser(user.id);

    // 2) Génère l'access token (stateless)
    const accessToken = signAccessToken(user);

    // 3) Génère + stocke le refresh token (stateful)
    const refreshToken = newRefreshToken();
    const refreshHash = sha256Hex(refreshToken);
    const expiresAt = refreshExpiresAt();

    await refreshRepo.createToken({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // 4) Cookie httpOnly
    clearRefreshCookie(res);
    res.cookie("refresh_token", refreshToken, refreshCookieOptions());

    return res.json({
      token: accessToken,
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
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Mot de passe trop court (min 8 caractères)." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const ok = await usersRepo.updatePassword(userId, hash, 0);
    if (!ok) return res.status(404).json({ error: "Utilisateur introuvable." });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd, // true en prod (HTTPS)
    sameSite: isProd ? "none" : "lax", // si front/back domaines différents en prod => none
    path: "/",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function refresh(req, res) {
  try {
    const refreshRepo = require("../repositories/refreshTokens.repository");

    const token = req.cookies?.refresh_token;
    if (!token)
      return res.status(401).json({ error: "Refresh token manquant." });

    const hash = sha256Hex(token);
    const stored = await refreshRepo.findValidByHash(hash);
    if (!stored)
      return res.status(401).json({ error: "Refresh token invalide." });

    const user = await usersRepo.findById(stored.user_id);
    if (!user || !user.is_active) {
      // compte désactivé => on révoque
      await refreshRepo.revokeToken(stored.id);
      res.clearCookie("refresh_token", { path: "/" });
      return res.status(403).json({ error: "Compte désactivé." });
    }

    // rotation
    const newToken = newRefreshToken();
    const newHash = sha256Hex(newToken);
    const expiresAt = refreshExpiresAt();

    await refreshRepo.rotateToken({ id: stored.id, newHash });
    await refreshRepo.createToken({
      userId: user.id,
      tokenHash: newHash,
      expiresAt,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // nouveau cookie
    clearRefreshCookie(res);
    res.cookie("refresh_token", newToken, refreshCookieOptions());

    // nouvel access token
    const accessToken = signAccessToken(user);

    return res.json({
      token: accessToken,
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

async function logout(req, res) {
  try {
    const refreshRepo = require("../repositories/refreshTokens.repository");
    const token = req.cookies?.refresh_token;

    if (token) {
      const hash = sha256Hex(token);
      const stored = await refreshRepo.findValidByHash(hash);
      if (stored) await refreshRepo.revokeToken(stored.id);
    }
    clearRefreshCookie(res);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

module.exports = { login, changePassword, refresh, logout };
