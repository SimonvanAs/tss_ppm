import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // Keycloak
  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().default('tss-ppm'),
  KEYCLOAK_CLIENT_ID: z.string().default('tss-ppm-api'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // JWT (for development/testing without Keycloak)
  JWT_SECRET: z.string().optional(),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
};

const env = parseEnv();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,

  database: {
    url: env.DATABASE_URL,
  },

  keycloak: {
    url: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID,
  },

  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),

  jwtSecret: env.JWT_SECRET,

  // Feature flags
  features: {
    enableSwagger: env.NODE_ENV !== 'production',
  },
} as const;

export type Config = typeof config;
