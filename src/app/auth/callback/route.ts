import { NextResponse } from "next/server";

import { getAccess } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { signOutLocally } from "@/infrastructure/supabase/server/sign-out";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=recovery_failed", requestUrl.origin),
      303,
    );
  }

  const client = await createClient("writable");
  const { error } = await client.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=recovery_failed", requestUrl.origin),
      303,
    );
  }

  const access = await getAccess(client);
  if (access.status !== "allowed") {
    await signOutLocally(client);
    const destination =
      access.status === "forbidden"
        ? "/login?error=access_denied"
        : "/login?error=recovery_failed";
    return NextResponse.redirect(new URL(destination, requestUrl.origin), 303);
  }

  return NextResponse.redirect(
    new URL("/update-password", requestUrl.origin),
    303,
  );
}
