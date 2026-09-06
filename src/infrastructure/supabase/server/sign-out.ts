import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/infrastructure/supabase/generated/database.types";
import { getPublicEnv } from "@/lib/env/public";

export function isSessionCookie(name: string) {
  const hostname = new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).hostname;
  const key = `sb-${hostname.split(".")[0]}-auth-token`;
  return (
    name === key ||
    name.startsWith(`${key}.`) ||
    name === `${key}-code-verifier`
  );
}

export async function signOutLocally(client: SupabaseClient<Database>) {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Local logout must still succeed when the Auth service is unavailable.
  } finally {
    // Always remove this project's cookies, even if Auth cannot revoke the refresh token.
    const store = await cookies();
    for (const { name } of store.getAll()) {
      if (isSessionCookie(name)) store.set(name, "", { path: "/", maxAge: 0 });
    }
  }
}
