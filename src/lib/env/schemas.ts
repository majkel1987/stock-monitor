import { z } from "zod";

const appUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    (url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) &&
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash
  );
}, "APP_URL must be a canonical HTTPS origin (HTTP is allowed only locally).");

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ALLOWED_USER_EMAIL: z.string().trim().pipe(z.email()),
  EODHD_API_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  APP_URL: appUrlSchema.optional(),
});

export const authEnvSchema = serverEnvSchema.pick({ ALLOWED_USER_EMAIL: true });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
