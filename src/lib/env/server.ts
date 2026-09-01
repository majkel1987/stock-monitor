import "server-only";

import { serverEnvSchema } from "@/lib/env/schemas";

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWED_USER_EMAIL: process.env.ALLOWED_USER_EMAIL,
    EODHD_API_TOKEN: process.env.EODHD_API_TOKEN || undefined,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_URL: process.env.APP_URL,
  });
}
