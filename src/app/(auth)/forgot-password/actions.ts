"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getAuthEnv, getServerEnv } from "@/lib/env/server";
import {
  isAllowedEmail,
  passwordResetRequestSchema,
} from "@/lib/validation/auth";

async function getRecoveryRedirectUrl() {
  const configuredUrl = getServerEnv().APP_URL;
  const requestOrigin = (await headers()).get("origin");
  const origin = configuredUrl ?? requestOrigin;

  if (!origin) return null;

  try {
    const url = new URL(origin);
    const isSafeProtocol =
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
    if (!isSafeProtocol || url.username || url.password) return null;

    return new URL("/auth/callback", url.origin).toString();
  } catch {
    return null;
  }
}

export async function requestPasswordReset(formData: FormData) {
  const input = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  // Return the same result for invalid, unknown, and non-allowlisted addresses.
  if (!input.success) redirect("/forgot-password?status=sent");

  const { ALLOWED_USER_EMAIL } = getAuthEnv();
  if (!isAllowedEmail(input.data.email, ALLOWED_USER_EMAIL)) {
    redirect("/forgot-password?status=sent");
  }

  const redirectTo = await getRecoveryRedirectUrl();
  if (!redirectTo) redirect("/forgot-password?error=unavailable");

  const client = await createClient("writable");
  const { error } = await client.auth.resetPasswordForEmail(input.data.email, {
    redirectTo,
  });

  if (error) redirect("/forgot-password?error=delivery_failed");
  redirect("/forgot-password?status=sent");
}
