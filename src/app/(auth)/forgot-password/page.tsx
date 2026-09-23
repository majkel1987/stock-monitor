import type { Metadata } from "next";
import Link from "next/link";

import { AuthSplit } from "@/components/auth/auth-split";

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
    <AuthSplit
      note={errorMessage ?? "Authorized single-user access only"}
      noteTone={errorMessage ? "danger" : "muted"}
      title="Reset password"
      titleId="reset-title"
    >
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        We will send a secure recovery link to your account email.
      </p>

      {sent ? (
        <div className="flex flex-col gap-4">
          <p
            aria-live="polite"
            className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-3 text-sm leading-relaxed text-secondary-foreground"
          >
            If the address belongs to the authorized account, a recovery link
            has been sent. Check your inbox and spam folder.
          </p>
          <Link className="ui-button ui-button-secondary w-full" href="/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form action={requestPasswordReset} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="ui-label">Email</span>
            <input
              aria-invalid={errorMessage ? true : undefined}
              autoComplete="email"
              className="ui-control"
              name="email"
              placeholder="investor@example.com"
              required
              type="email"
            />
          </label>
          <button className="ui-button ui-button-primary w-full" type="submit">
            Send recovery link
          </button>
          <Link
            className="py-2 text-center text-sm text-muted-foreground hover:text-foreground"
            href="/login"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthSplit>
  );
}
