'use strict';
const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RESET_TOKEN_EXPIRES_MIN: z.coerce.number().default(30),
  VERIFY_TOKEN_EXPIRES_HOURS: z.coerce.number().default(24),

  // Cloud (Render + Supabase): set DATABASE_URL to the Supabase Session pooler
  // string and the discrete MYSQL_* vars below are ignored. Local dev leaves
  // DATABASE_URL unset and uses the MYSQL_* vars.
  DATABASE_URL: z.string().optional(),
  DB_SSL: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),

  // Local DB engine when DATABASE_URL is not set.
  //   'sqlite' (default) -> zero-setup file database, no server/user/password.
  //   'mysql'            -> use the discrete MYSQL_* vars below.
  DB_DIALECT: z.enum(['sqlite', 'mysql']).default('sqlite'),
  // SQLite file location (relative to the backend folder).
  DB_STORAGE: z.string().default('db/caligoods.sqlite'),

  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().default(''),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Caligoods <no-reply@caligoodsinc.com>'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(1000),

  // Zoho (Phase 2+). Optional in Phase 1 so the app boots without them.
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REFRESH_TOKEN: z.string().optional(),
  ZOHO_ORGANIZATION_ID: z.string().optional(),
  ZOHO_ACCOUNTS_URL: z.string().default('https://accounts.zoho.com'),
  ZOHO_API_DOMAIN: z.string().default('https://www.zohoapis.com'),
}).superRefine((val, ctx) => {
  // DB resolution: DATABASE_URL (cloud/postgres) -> else DB_DIALECT.
  //   sqlite (default): nothing else required.
  //   mysql: needs MYSQL_DATABASE + MYSQL_USER.
  if (!val.DATABASE_URL && val.DB_DIALECT === 'mysql' && !(val.MYSQL_DATABASE && val.MYSQL_USER)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MYSQL_DATABASE'],
      message:
        'DB_DIALECT=mysql requires both MYSQL_DATABASE and MYSQL_USER (or set DB_DIALECT=sqlite, or use DATABASE_URL).',
    });
  }
});

// In LIVE_INVENTORY_ONLY mode the JWT secrets are never used (no auth), so
// provide safe unused defaults instead of requiring them for deployment.
if (String(process.env.LIVE_INVENTORY_ONLY || process.env.SKIP_DB || '').toLowerCase() === 'true') {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `live_only_unused_${'a'.repeat(32)}`;
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `live_only_unused_${'b'.repeat(32)}`;
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('\u274c Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

module.exports = parsed.data;
