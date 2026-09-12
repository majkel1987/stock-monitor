import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccess } from "@/infrastructure/supabase/server/auth";

import { updatePassword } from "./actions";

export const metadata: Metadata = { title: "Set new password" };

const errors = {
  invalid_password:
    "Use at least 12 characters and enter the same password twice.",
  update_failed:
    "The password could not be updated. Request a new recovery link.",
} as const;

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await getAccess();
  if (access.status !== "allowed") {
    redirect(
      access.status === "forbidden"
        ? "/login?error=access_denied"
        : "/login?error=recovery_failed",
    );
  }

  const { error } = await searchParams;
  const errorMessage =
    error && error in errors ? errors[error as keyof typeof errors] : null;

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-primary)] px-4">
      <section
        aria-labelledby="password-title"
        className="flex w-[360px] flex-col gap-[18px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-default)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
      >
        <div className="flex flex-col items-center">
          <div className="grid size-[34px] place-items-center rounded-[6px] bg-[var(--accent-primary)] text-[var(--bg-primary)]">
            <span className="font-mono text-[11px] font-bold">SM</span>
          </div>
          <h1
            className="mt-2 text-[18px] leading-[23px] font-semibold"
            id="password-title"
          >
            Set a new password
          </h1>
          <p className="mt-2 text-center text-[10px] leading-[13px] text-[var(--text-muted)]">
            Choose a unique password with at least 12 characters.
          </p>
        </div>

        <form action={updatePassword} className="flex flex-col gap-3">
          <label className="flex flex-col gap-[5px]">
            <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              New password
            </span>
            <input
              autoComplete="new-password"
              aria-invalid={errorMessage ? true : undefined}
              className="h-[34px] rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs outline-none placeholder:text-[var(--text-disabled)] focus:border-[var(--focus)]"
              minLength={12}
              name="password"
              placeholder="At least 12 characters"
              required
              type="password"
            />
          </label>
          <label className="flex flex-col gap-[5px]">
            <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              Confirm password
            </span>
            <input
              autoComplete="new-password"
              aria-invalid={errorMessage ? true : undefined}
              className="h-[34px] rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px] text-xs outline-none placeholder:text-[var(--text-disabled)] focus:border-[var(--focus)]"
              minLength={12}
              name="passwordConfirmation"
              placeholder="Repeat the new password"
              required
              type="password"
            />
          </label>
          <button
            className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
            type="submit"
          >
            Update password
          </button>
        </form>

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
