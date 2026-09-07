import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/supabase/generated/database.types";
import { getServerEnv } from "@/lib/env/server";

export function createServiceClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
