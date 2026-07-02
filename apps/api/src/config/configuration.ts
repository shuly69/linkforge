import { z } from "zod";

/**
 * Environment schema. Validated once at boot (see validate) so the process
 * fails fast with a readable message instead of throwing deep in a request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().default(604800),

  SHORT_LINK_BASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

export function validate(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

/** Strongly-typed config tree consumed via ConfigService. */
export interface AppConfig {
  nodeEnv: Env["NODE_ENV"];
  port: number;
  databaseUrl: string;
  redisUrl: string;
  shortLinkBaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
  };
  web: { origin: string };
}

export function configuration(): AppConfig {
  const env = validate(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.API_PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    shortLinkBaseUrl: env.SHORT_LINK_BASE_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    web: { origin: env.WEB_ORIGIN },
  };
}
