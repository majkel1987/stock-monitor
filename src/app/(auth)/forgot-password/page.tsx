import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Reset password" };

const errors = {
  unavailable: "Password recovery is not configured for this deployment.",
  delivery_failed: "The recovery email could not be sent. Try again later.",
} as const;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;
  const errorMessage =
    error && error in errors ? errors[error as keyof typeof errors] : null;
  const sent = status === "sent";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-primary)] px-4">
      <section
        aria-labelledby="reset-title"
        className="flex w-[360px] flex-col gap-[18px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
      >
        <div className="flex flex-col items-center">
          <div className="grid size-[34px] place-items-center rounded-[6px] bg-[var(--accent-primary)] text-[var(--bg-primary)]">
            <span className="font-mono text-[11px] font-bold">SM</span>
          </div>
          <h1
            className="mt-2 text-[18px] leading-[23px] font-semibold"
            id="reset-title"
          >
            Reset password
          </h1>
          <p className="mt-2 text-center text-[10px] leading-[13px] text-[var(--text-muted)]">
            We will send a secure recovery link to your account email.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-3">
            <p
              aria-live="polite"
              className="rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[10px] py-2 text-xs leading-5 text-[var(--text-secondary)]"
            >
              If the address belongs to the authorized account, a recovery link
              has been sent. Check your inbox and spam folder.
            </p>
            <Link
              className="flex h-8 items-center justify-center rounded-[5px] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              href="/login"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="flex flex-col gap-3">
            <label className="flex flex-col gap-[5px]">
              <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
                Email
              </span>
              <input
                autoComplete="email"
                aria-invalid={errorMessage ? true : undefined}
                className="h-[34px] rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs outline-none placeholder:text-[var(--text-disabled)] focus:border-[var(--focus)]"
                name="email"
                placeholder="investor@example.com"
                required
                type="email"
              />
            </label>
            <button
              className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
              type="submit"
            >
              Send recovery link
            </button>
            <Link
              className="text-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              href="/login"
            >
              Back to sign in
            </Link>
          </form>
        )}

        <p
          aria-live="polite"
          className={`text-center text-[9px] leading-3 ${errorMessage ? "text-[var(--negative)]" : "text-[var(--text-muted)]"}`}
        >
          {errorMessage ?? "Authorized single-user access only"}
        </p>
      </section>
    </main>
  );
}
