import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getAuthEnv } from "@/lib/env/server";
import { isAllowedEmail } from "@/lib/validation/auth";
import type { Database } from "@/infrastructure/supabase/generated/database.types";
import { createClient } from "./create-client";

type Access =
  | { status: "allowed"; user: User }
  | { status: "unauthenticated" | "forbidden"; user: null };

export async function getAccess(
  client?: SupabaseClient<Database>,
): Promise<Access> {
  const { ALLOWED_USER_EMAIL } = getAuthEnv();
  const supabase = client ?? (await createClient());
  // Fetch the current Auth record: cookie contents and cached email claims are not authority.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "unauthenticated", user: null };
  if (!isAllowedEmail(data.user.email, ALLOWED_USER_EMAIL)) {
    return { status: "forbidden", user: null };
  }
  return { status: "allowed", user: data.user };
}

// Call independently in every private Server Action / application query.
export async function requireAllowedUser() {
  const access = await getAccess();
  if (access.status !== "allowed") {
    redirect(
      access.status === "forbidden" ? "/login?error=access_denied" : "/login",
    );
  }
  return access.user;
}
