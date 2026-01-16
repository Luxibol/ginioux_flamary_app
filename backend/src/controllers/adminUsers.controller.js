const bcrypt = require("bcrypt");
const crypto = require("crypto");
const usersRepo = require("../repositories/users.repository");

const ALLOWED_ROLES = ["ADMIN", "BUREAU", "PRODUCTION"];

function asInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normStr(v) {
  return String(v ?? "").trim();
}

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toLoginSafe(s) {
  // lowercase + sans accents + alphanum only
  const t = stripAccents(String(s || "").toLowerCase());
  return t.replace(/[^a-z0-9]/g, "");
}

function buildLogin(lastName, firstName) {
  const ln = toLoginSafe(lastName);
  const fi = toLoginSafe(firstName).slice(0, 1);
  return `${ln}${fi}`;
}

async function ensureUniqueLogin(base) {
  let login = base;
  let i = 2;

  // base vide => pas OK
  if (!login)
    throw new Error("Login automatique impossible (nom/prénom invalides).");

  // Si existe déjà, on suffixe: base2, base3...
  // (base sans chiffre si libre)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await usersRepo.existsLogin(login);
    if (!exists) return login;
    login = `${base}${i}`;
    i += 1;
    if (i > 9999) throw new Error("Impossible de générer un login unique.");
  }
}

function generateTempPassword() {
  // Style "G7-FR92-AB3Q" (3 groupes: 2-4-4)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
  const pick = (len) => {
    const bytes = crypto.randomBytes(len);
    let out = "";
    for (let i = 0; i < len; i += 1)
      out += alphabet[bytes[i] % alphabet.length];
    return out;
  };

  return `${pick(2)}-${pick(4)}-${pick(4)}`;
}

async function listUsers(req, res) {
  try {
    const q = normStr(req.query.q);
    const role = normStr(req.query.role);
    const active =
      req.query.active !== undefined ? normStr(req.query.active) : "";

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide." });
    }
    if (active !== "" && active !== "0" && active !== "1") {
      return res.status(400).json({ error: "Filtre active invalide." });
    }

    const { rows, count } = await usersRepo.listUsers({
      q: q || undefined,
      role: role || undefined,
      active: active !== "" ? Number(active) : undefined,
    });

    return res.json({ data: rows, count });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

async function createUser(req, res) {
  try {
    const first_name = normStr(req.body.first_name);
    const last_name = normStr(req.body.last_name);
    const role = normStr(req.body.role);
    const is_active =
      req.body.is_active === undefined ? 1 : Number(req.body.is_active) ? 1 : 0;

    // login optionnel (admin peut le saisir), sinon auto
    const loginInput =
      req.body.login !== undefined ? normStr(req.body.login) : "";

    if (!first_name)
      return res.status(400).json({ error: "Prénom obligatoire." });
    if (!last_name) return res.status(400).json({ error: "Nom obligatoire." });
    if (!ALLOWED_ROLES.includes(role))
      return res.status(400).json({ error: "Rôle invalide." });

    let login = loginInput ? toLoginSafe(loginInput) : "";
    if (loginInput && !login)
      return res.status(400).json({ error: "Identifiant invalide." });

    if (!login) {
      const base = buildLogin(last_name, first_name);
      login = await ensureUniqueLogin(base);
    } else {
      const exists = await usersRepo.existsLogin(login);
      if (exists)
        return res.status(409).json({ error: "Identifiant déjà utilisé." });
    }

    // mot de passe temporaire + must_change_password=1
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const created = await usersRepo.createUser({
      first_name,
      last_name,
      login,
      password_hash: hash,
      role,
      is_active,
      must_change_password: 1,
    });

    return res.status(201).json({
      user: created,
      temp_password: tempPassword, // affiché une seule fois côté UI
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

async function patchUser(req, res) {
  try {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalide." });

    const patch = {};

    if (req.body.first_name !== undefined) {
      const v = normStr(req.body.first_name);
      if (!v) return res.status(400).json({ error: "Prénom invalide." });
      patch.first_name = v;
    }

    if (req.body.last_name !== undefined) {
      const v = normStr(req.body.last_name);
      if (!v) return res.status(400).json({ error: "Nom invalide." });
      patch.last_name = v;
    }

    if (req.body.role !== undefined) {
      const v = normStr(req.body.role);
      if (!ALLOWED_ROLES.includes(v))
        return res.status(400).json({ error: "Rôle invalide." });
      patch.role = v;
    }

    if (req.body.is_active !== undefined) {
      patch.is_active = Number(req.body.is_active) ? 1 : 0;
    }

    if (req.body.login !== undefined) {
      const raw = normStr(req.body.login);
      const v = toLoginSafe(raw);
      if (!v) return res.status(400).json({ error: "Identifiant invalide." });

      // unique (hors user courant)
      const exists = await usersRepo.existsLogin(v, { excludeUserId: id });
      if (exists)
        return res.status(409).json({ error: "Identifiant déjà utilisé." });

      patch.login = v;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à modifier." });
    }

    const ok = await usersRepo.patchUser(id, patch);
    if (!ok) return res.status(404).json({ error: "Utilisateur introuvable." });

    const user = await usersRepo.findById(id);
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

async function resetPassword(req, res) {
  try {
    const id = asInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalide." });

    const user = await usersRepo.findById(id);
    if (!user)
      return res.status(404).json({ error: "Utilisateur introuvable." });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const ok = await usersRepo.updatePassword(id, hash, 1);
    if (!ok) return res.status(404).json({ error: "Utilisateur introuvable." });

    return res.json({
      ok: true,
      temp_password: tempPassword,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}

module.exports = {
  listUsers,
  createUser,
  patchUser,
  resetPassword,
};
