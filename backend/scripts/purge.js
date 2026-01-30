/**
 * @file backend/scripts/purge.js
 * @description Script one-shot (cron) :
 * - purge refresh_tokens (expirés ou révoqués > 7 jours)
 * - purge orders archivées (> 365 jours) + cascade
 *
 * Env optionnelles:
 * - PURGE_DRY_RUN=1 (n'efface rien, affiche seulement)
 * - REFRESH_REVOKED_DAYS=7
 * - ORDERS_ARCHIVE_DAYS=365
 *
 * Usage:
 *   node backend/scripts/purge.js
 */
const { pool } = require("../src/config/db");

function asInt(v, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.trunc(n));
}

async function purgeRefreshTokens({ dryRun, revokedDays }) {
  const sqlSelect = `
    SELECT COUNT(*) AS n
    FROM refresh_tokens
    WHERE expires_at < NOW()
       OR (revoked_at IS NOT NULL AND revoked_at < (NOW() - INTERVAL ? DAY))
  `;
  const [[countRow]] = await pool.query(sqlSelect, [revokedDays]);

  if (dryRun) {
    console.log(`[purge] refresh_tokens would_delete=${countRow.n}`);
    return { wouldDelete: countRow.n, deleted: 0 };
  }

  const sqlDelete = `
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR (revoked_at IS NOT NULL AND revoked_at < (NOW() - INTERVAL ? DAY))
  `;
  const [res] = await pool.query(sqlDelete, [revokedDays]);
  console.log(`[purge] refresh_tokens deleted=${res.affectedRows}`);
  return { wouldDelete: countRow.n, deleted: res.affectedRows };
}

async function purgeArchivedOrders({ dryRun, archiveDays }) {
  // On se base sur updated_at (ou created_at). Si tu veux “date d’archivage”, il faudra une colonne archived_at.
  const sqlSelect = `
    SELECT COUNT(*) AS n
    FROM orders
    WHERE is_archived = 1
      AND updated_at < (NOW() - INTERVAL ? DAY)
  `;
  const [[countRow]] = await pool.query(sqlSelect, [archiveDays]);

  if (dryRun) {
    console.log(
      `[purge] orders(archived) would_delete=${countRow.n} (>${archiveDays}d)`,
    );
    return { wouldDelete: countRow.n, deleted: 0 };
  }

  const sqlDelete = `
    DELETE FROM orders
    WHERE is_archived = 1
      AND updated_at < (NOW() - INTERVAL ? DAY)
  `;
  const [res] = await pool.query(sqlDelete, [archiveDays]);
  console.log(
    `[purge] orders(archived) deleted=${res.affectedRows} (cascade children)`,
  );
  return { wouldDelete: countRow.n, deleted: res.affectedRows };
}

/**
 * Point d'entrée du script.
 * @returns {Promise<void>}
 */
async function main() {
  const dryRun = String(process.env.PURGE_DRY_RUN || "") === "1";
  const revokedDays = asInt(process.env.REFRESH_REVOKED_DAYS, 7);
  const archiveDays = asInt(process.env.ORDERS_ARCHIVE_DAYS, 365);

  console.log(
    `[purge] start dryRun=${dryRun} revokedDays=${revokedDays} archiveDays=${archiveDays}`,
  );

  await purgeRefreshTokens({ dryRun, revokedDays });
  await purgeArchivedOrders({ dryRun, archiveDays });

  await pool.end();

  console.log(`[purge] done at=${new Date().toISOString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[purge] error:", err);
    try {
      await pool.end(); // <-- AJOUT
    } catch {}
    process.exit(1);
  });
