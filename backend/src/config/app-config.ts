const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DEFAULT_ACCESS_SECRET = "please_change_access_secret";

const resolveAccessSecret = (): string => {
  const fromEnv = process.env.JWT_ACCESS_SECRET?.trim();
  const accessSecret = fromEnv || DEFAULT_ACCESS_SECRET;

  // 生产环境禁止使用默认 JWT 密钥启动，避免默认密钥被利用伪造令牌。
  if (process.env.NODE_ENV === "production" && accessSecret === DEFAULT_ACCESS_SECRET) {
    throw new Error(
      "JWT_ACCESS_SECRET must be explicitly configured in production environment"
    );
  }

  return accessSecret;
};

export const appConfig = {
  port: toNumber(process.env.PORT, 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
  jwtAccessSecret: resolveAccessSecret(),
  accessTokenTtlSeconds: toNumber(process.env.ACCESS_TOKEN_TTL_SECONDS, 7200),
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  loginMaxFailures: toNumber(process.env.LOGIN_MAX_FAILURES, 5),
  loginWindowMs: toNumber(process.env.LOGIN_WINDOW_MS, 5 * 60 * 1000),
  loginBlockMs: toNumber(process.env.LOGIN_BLOCK_MS, 10 * 60 * 1000),
  webDavRetention: toNumber(process.env.WEBDAV_RETENTION, 10)
};
