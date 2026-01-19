// backend/src/config/auth.constants.js

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 30;

const REFRESH_COOKIE_NAME = "refresh_token";

// Ancien path utilisé avant le cookie unique sur "/"
const LEGACY_REFRESH_COOKIE_PATH = "/auth/refresh";

module.exports = {
  ACCESS_TTL,
  REFRESH_TTL_DAYS,
  REFRESH_COOKIE_NAME,
  LEGACY_REFRESH_COOKIE_PATH,
};
