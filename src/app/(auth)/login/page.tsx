import type { Metadata } from "next";
import Link from "next/link";

import { AuthSplit } from "@/components/auth/auth-split";

import { login } from "./actions";
import { LoginSubmitButton } from "./login-submit-button";

export const metadata: Metadata = { title: "Sign in" };

const messages = {
  invalid_credentials: "Invalid email or password.",
  access_denied: "Access is not authorized for this account.",
  recovery_failed: "The recovery link is invalid or has expired.",
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error && error in messages
      ? messages[error as keyof typeof messages]
      : null;

  return (
    <AuthSplit
      note={message ?? "Authorized single-user access only"}
      noteTone={message ? "danger" : "muted"}
      title="Sign in"
      titleId="login-title"
    >
      <form action={login} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="ui-label">Email</span>
          <input
            aria-invalid={message ? true : undefined}
            autoComplete="email"
            autoFocus
            className="ui-control"
            name="email"
            placeholder="investor@example.com"
            required
            type="email"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="ui-label">Password</span>
            <input
              aria-invalid={message ? true : undefined}
              autoComplete="current-password"
              className="ui-control"
              name="password"
              placeholder="••••••••••••"
              required
              type="password"
            />
          </label>
          <div className="flex min-h-9 items-center justify-end">
            <Link
              className="rounded-[var(--radius-sm)] px-1 py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="pt-1">
          <LoginSubmitButton />
        </div>
      </form>
    </AuthSplit>
  );
}
