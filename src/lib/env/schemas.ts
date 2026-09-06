import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ALLOWED_USER_EMAIL: z.string().trim().pipe(z.email()),
  EODHD_API_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  APP_URL: z.url().optional(),
});

export const authEnvSchema = serverEnvSchema.pick({ ALLOWED_USER_EMAIL: true });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
