function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? "3000"),
  databaseUrl: requireEnv("DATABASE_URL", "postgres://localhost:5432/notes"),
  sessionSecret: requireEnv("SESSION_SECRET", "dev-secret-change-me"),
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES ?? "30"),
  accessTokenExpiresMinutes: Number(process.env.ACCESS_TOKEN_EXPIRES_MINUTES ?? "15"),
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? "7"),
} as const;
