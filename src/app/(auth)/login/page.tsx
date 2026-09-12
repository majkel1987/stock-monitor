import type { Metadata } from "next";
import Link from "next/link";

import { login } from "./actions";

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
    <main className="grid min-h-screen place-items-center bg-[var(--bg-primary)]">
      <section
        aria-labelledby="login-title"
        className="flex h-[344px] w-[360px] flex-col gap-[18px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
      >
        <div className="flex h-[86px] flex-col items-center">
          <div className="grid size-[34px] place-items-center rounded-[6px] bg-[var(--accent-primary)] text-[var(--bg-primary)]">
            <span className="font-mono text-[11px] font-bold">SM</span>
          </div>
          <h1
            className="mt-2 h-[23px] text-[18px] leading-[23px] font-semibold"
            id="login-title"
          >
            Stock Monitor
          </h1>
          <p className="mt-2 h-[13px] text-[10px] leading-[13px] text-[var(--text-muted)]">
            Private investment research · GPW + USA
          </p>
        </div>

        <form action={login} className="flex flex-col gap-3">
          <label className="flex flex-col gap-[5px]">
            <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              Email
            </span>
            <input
              autoComplete="email"
              aria-invalid={message ? true : undefined}
              className="h-[34px] rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs outline-none placeholder:text-[var(--text-disabled)] focus:border-[var(--focus)]"
              placeholder="investor@example.com"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className="flex items-center justify-between text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              <span>Password</span>
              <Link
                className="font-normal text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            </span>
            <input
              autoComplete="current-password"
              aria-invalid={message ? true : undefined}
              className="h-[34px] rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs outline-none placeholder:text-[var(--text-disabled)] focus:border-[var(--focus)]"
              placeholder="••••••••••••"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p
          aria-live="polite"
          className={`text-center text-[9px] leading-3 ${message ? "text-[var(--negative)]" : "text-[var(--text-muted)]"}`}
        >
          {message ?? "Authorized single-user access only"}
        </p>
      </section>
    </main>
  );
}
