import "server-only";

import { authEnvSchema, serverEnvSchema } from "@/lib/env/schemas";

export function getAuthEnv() {
  return authEnvSchema.parse({
    ALLOWED_USER_EMAIL: process.env.ALLOWED_USER_EMAIL,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    ALLOWED_USER_EMAIL: process.env.ALLOWED_USER_EMAIL,
    EODHD_API_TOKEN: process.env.EODHD_API_TOKEN || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    APP_URL: process.env.APP_URL || undefined,
  });
}
