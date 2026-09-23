"use client";

import { useFormStatus } from "react-dom";

export const LoginSubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className="ui-button ui-button-primary w-full"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
};
