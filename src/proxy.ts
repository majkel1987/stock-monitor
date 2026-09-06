import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/infrastructure/supabase/generated/database.types";
import { getAccess } from "@/infrastructure/supabase/server/auth";
import { isSessionCookie } from "@/infrastructure/supabase/server/sign-out";
import { getPublicEnv } from "@/lib/env/public";

export async function proxy(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          previous.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const access = await getAccess(client);
  if (access.status === "forbidden") {
    await client.auth.signOut({ scope: "local" });
    for (const { name } of request.cookies.getAll()) {
      if (isSessionCookie(name))
        response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  const pathname = request.nextUrl.pathname;
  let destination: NextResponse | undefined;
  if (pathname.startsWith("/api/") && access.status !== "allowed") {
    destination = NextResponse.json(
      { error: access.status },
      { status: access.status === "forbidden" ? 403 : 401 },
    );
  } else if (pathname !== "/login" && access.status !== "allowed") {
    const url = new URL("/login", request.url);
    if (access.status === "forbidden")
      url.searchParams.set("error", "access_denied");
    destination = NextResponse.redirect(url, 303);
  } else if (
    pathname === "/login" &&
    access.status === "allowed" &&
    request.method === "GET"
  ) {
    destination = NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (destination) {
    response.cookies
      .getAll()
      .forEach((cookie) => destination.cookies.set(cookie));
    response = destination;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Exclude actual public asset namespaces, never arbitrary extensions on private routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico$).*)"],
};
