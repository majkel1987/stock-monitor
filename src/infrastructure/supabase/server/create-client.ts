import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

// Only Server Actions and Route Handlers may opt into cookie writes.
// Proxy refreshes cookies before read-only Server Components execute.
export async function createClient(
  mode: "read-only" | "writable" = "read-only",
) {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (mode === "writable") {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          }
        },
      },
    },
  );
}
