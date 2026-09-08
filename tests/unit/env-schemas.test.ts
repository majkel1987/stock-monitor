import { describe, expect, it } from "vitest";

import { publicEnvSchema, serverEnvSchema } from "@/lib/env/schemas";

describe("environment schemas", () => {
  it("starts Auth without future integration secrets", () => {
    expect(
      serverEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
        ALLOWED_USER_EMAIL: "owner@example.com",
      }).success,
    ).toBe(true);
  });
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
      CRON_SECRET: "a-development-secret-that-is-long-enough",
      APP_URL: "http://localhost:3000",
    });

    expect(result.success).toBe(true);
  });

  it("requires HTTPS for non-local APP_URL values", () => {
    const result = serverEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
      ALLOWED_USER_EMAIL: "owner@example.com",
      APP_URL: "http://preview.example.com",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an APP_URL with credentials, a path, query, or fragment", () => {
    for (const APP_URL of [
      "https://user:password@example.com",
      "https://example.com/preview",
      "https://example.com?target=preview",
      "https://example.com#preview",
    ]) {
      expect(
        serverEnvSchema.safeParse({
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
          ALLOWED_USER_EMAIL: "owner@example.com",
          APP_URL,
        }).success,
      ).toBe(false);
    }
  });
});
