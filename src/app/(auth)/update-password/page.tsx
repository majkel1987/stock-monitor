import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthSplit } from "@/components/auth/auth-split";
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
    <AuthSplit
      note={errorMessage ?? "Authorized single-user access only"}
      noteTone={errorMessage ? "danger" : "muted"}
      title="Set a new password"
      titleId="password-title"
    >
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Choose a unique password with at least 12 characters.
      </p>

      <form action={updatePassword} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="ui-label">New password</span>
          <input
            aria-invalid={errorMessage ? true : undefined}
            autoComplete="new-password"
            className="ui-control"
            minLength={12}
            name="password"
            placeholder="At least 12 characters"
            required
            type="password"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ui-label">Confirm password</span>
          <input
            aria-invalid={errorMessage ? true : undefined}
            autoComplete="new-password"
            className="ui-control"
            minLength={12}
            name="passwordConfirmation"
            placeholder="Repeat the new password"
            required
            type="password"
          />
        </label>
        <button className="ui-button ui-button-primary w-full" type="submit">
          Update password
        </button>
      </form>
    </AuthSplit>
  );
}
