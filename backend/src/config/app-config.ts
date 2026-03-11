const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  port: toNumber(process.env.PORT, 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ?? "please_change_access_secret",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? "please_change_refresh_secret",
  accessTokenTtlSeconds: toNumber(process.env.ACCESS_TOKEN_TTL_SECONDS, 7200),
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  loginMaxFailures: toNumber(process.env.LOGIN_MAX_FAILURES, 5),
  loginWindowMs: toNumber(process.env.LOGIN_WINDOW_MS, 5 * 60 * 1000),
  loginBlockMs: toNumber(process.env.LOGIN_BLOCK_MS, 10 * 60 * 1000),
  webDavRetention: toNumber(process.env.WEBDAV_RETENTION, 10)
};

