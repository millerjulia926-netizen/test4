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
} as const;
