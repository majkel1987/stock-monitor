import { describe, expect, it } from "vitest";

import { publicEnvSchema, serverEnvSchema } from "@/lib/env/schemas";

describe("environment schemas", () => {
  it("accepts the public Supabase configuration", () => {
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
    });

    expect(result.success).toBe(true);
  });

  it("keeps the market-data token optional for manual mode", () => {
    const result = serverEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
      SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
      ALLOWED_USER_EMAIL: "owner@example.com",
      CRON_SECRET: "a-development-secret",
      APP_URL: "http://localhost:3000",
    });

    expect(result.success).toBe(true);
  });
});
